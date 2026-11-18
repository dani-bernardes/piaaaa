import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Linking, Platform, Image,
} from 'react-native';
import * as Location from 'expo-location';

// A WebView só existe no celular; no navegador usamos um iframe
let WebView = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

// >>> AJUSTE: use o mesmo endereço do backend das outras telas
const API_URL = 'http://localhost:3000';

const CORES = {
  roxo: '#6A1B9A',
  lilas: '#B39DDB',
  esmeralda: '#00A878',
  agua: '#4DD0C8',
};

const TIPOS = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'brecho', rotulo: 'Brechós' },
  { valor: 'atelie', rotulo: 'Ateliês' },
  { valor: 'feira', rotulo: 'Feiras' },
  { valor: 'ponto_coleta', rotulo: 'Coleta' },
];

const COR_TIPO = {
  brecho: '#6A1B9A',
  atelie: '#00A878',
  feira: '#F9A825',
  ponto_coleta: '#4DD0C8',
};

const ROTULO_TIPO = {
  brecho: 'Brechó',
  atelie: 'Ateliê',
  feira: 'Feira',
  ponto_coleta: 'Ponto de coleta',
};

// Mapa Leaflet + OpenStreetMap (gratuito, sem chave de API)
const HTML_MAPA = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html, body, #mapa { height: 100%; margin: 0; padding: 0; }
    .pino {
      width: 26px; height: 26px; border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg); border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,.4);
    }
    .eu {
      width: 16px; height: 16px; border-radius: 50%;
      background: #1E88E5; border: 3px solid #fff;
      box-shadow: 0 0 0 3px rgba(30,136,229,.35);
    }
  </style>
</head>
<body>
  <div id="mapa"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var mapa = L.map('mapa').setView([-14.235, -51.925], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapa);

    var camada = L.layerGroup().addTo(mapa);
    var marcadorEu = null;

    function enviar(obj) {
      var texto = JSON.stringify(obj);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(texto);   // celular
      } else {
        window.parent.postMessage(texto, '*');          // navegador (iframe)
      }
    }

    function iconePino(cor) {
      return L.divIcon({
        className: '',
        html: '<div class="pino" style="background:' + cor + '"></div>',
        iconSize: [26, 26],
        iconAnchor: [13, 26]
      });
    }

    function tratar(texto) {
      var msg;
      try { msg = JSON.parse(texto); } catch (e) { return; }

      if (msg.acao === 'marcadores') {
        camada.clearLayers();
        var pontos = [];
        msg.lista.forEach(function (est) {
          var m = L.marker([est.latitude, est.longitude], { icon: iconePino(est.cor) }).addTo(camada);
          m.on('click', function () { enviar({ acao: 'selecionar', id: est.id }); });
          pontos.push([est.latitude, est.longitude]);
        });
        if (msg.ajustar && pontos.length > 0) {
          mapa.fitBounds(pontos, { padding: [40, 40], maxZoom: 16 });
        }
      }

      if (msg.acao === 'minhaPosicao') {
        if (marcadorEu) mapa.removeLayer(marcadorEu);
        marcadorEu = L.marker([msg.lat, msg.lng], {
          icon: L.divIcon({ className: '', html: '<div class="eu"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })
        }).addTo(mapa);
        mapa.setView([msg.lat, msg.lng], 14);
      }
    }

    window.receberMsg = tratar; // usado pelo celular (injectJavaScript)
    window.addEventListener('message', function (e) { // usado pelo navegador
      if (typeof e.data === 'string') tratar(e.data);
    });

    enviar({ acao: 'pronto' });
  </script>
</body>
</html>
`;

export default function MapaScreen() {
  const webRef = useRef(null);
  const iframeRef = useRef(null);
  const listaRef = useRef([]);

  const [mapaPronto, setMapaPronto] = useState(false);
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [posicao, setPosicao] = useState(null); // { lat, lng }
  const [raio, setRaio] = useState(10);          // km (só com "Perto de mim")
  const [selecionado, setSelecionado] = useState(null);

  // ---------- comunicação com o mapa ----------
  function enviarAoMapa(obj) {
    const texto = JSON.stringify(obj);
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(texto, '*');
    } else {
      webRef.current?.injectJavaScript(`window.receberMsg(${JSON.stringify(texto)}); true;`);
    }
  }

  function tratarMensagem(texto) {
    let msg;
    try { msg = JSON.parse(texto); } catch (e) { return; }

    if (msg.acao === 'pronto') setMapaPronto(true);

    if (msg.acao === 'selecionar') {
      const est = listaRef.current.find((e) => e.id_estabelecimento === msg.id);
      if (est) setSelecionado(est);
    }
  }

  // no navegador, as mensagens do iframe chegam pelo window
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const ouvir = (e) => {
      if (typeof e.data === 'string') tratarMensagem(e.data);
    };
    window.addEventListener('message', ouvir);
    return () => window.removeEventListener('message', ouvir);
  }, []);

  // ---------- dados ----------
  async function carregar() {
    setCarregando(true);
    setErro('');

    try {
      const params = new URLSearchParams();
      if (busca.trim()) params.append('q', busca.trim());
      if (tipo) params.append('tipo', tipo);
      if (posicao) {
        params.append('lat', String(posicao.lat));
        params.append('lng', String(posicao.lng));
        params.append('raio', String(raio));
      }

      const resposta = await fetch(`${API_URL}/estabelecimentos?${params.toString()}`);
      const dados = await resposta.json();

      if (!resposta.ok) throw new Error(dados.mensagem || 'Erro ao carregar o mapa.');

      listaRef.current = dados;
      setLista(dados);
      setSelecionado(null);

      enviarAoMapa({
        acao: 'marcadores',
        ajustar: true,
        lista: dados.map((e) => ({
          id: e.id_estabelecimento,
          latitude: e.latitude,
          longitude: e.longitude,
          cor: COR_TIPO[e.tipo] || CORES.roxo,
        })),
      });
    } catch (e) {
      setErro(e.message || 'Não foi possível carregar o mapa.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (mapaPronto) carregar();
  }, [mapaPronto, tipo, posicao, raio]);

  async function irParaPerto() {
    setErro('');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErro('Permita o acesso à localização para ver o que há perto de você.');
        return;
      }

      const atual = await Location.getCurrentPositionAsync({});
      const pos = { lat: atual.coords.latitude, lng: atual.coords.longitude };

      setPosicao(pos);
      enviarAoMapa({ acao: 'minhaPosicao', ...pos });
    } catch (e) {
      setErro('Não foi possível obter a sua localização.');
    }
  }

  function abrirRota(est) {
    const destino = `${est.latitude},${est.longitude}`;
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${destino}`
        : `https://www.google.com/maps/dir/?api=1&destination=${destino}`;

    Linking.openURL(url);
  }

  const distanciaTexto = useMemo(() => {
    if (!selecionado || selecionado.distancia_km == null) return null;
    return `${selecionado.distancia_km.toFixed(1)} km de você`;
  }, [selecionado]);

  // ---------- tela ----------
  return (
    <View style={estilos.container}>
      <View style={estilos.topo}>
        <View style={estilos.linhaBusca}>
          <TextInput
            style={estilos.input}
            placeholder="Buscar por nome..."
            placeholderTextColor="#888"
            value={busca}
            onChangeText={setBusca}
            onSubmitEditing={carregar}
            returnKeyType="search"
          />
          <TouchableOpacity style={estilos.botaoBusca} onPress={carregar}>
            <Text style={estilos.textoBotao}>Buscar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.filtros}>
          {TIPOS.map((t) => {
            const ativo = tipo === t.valor;
            return (
              <TouchableOpacity
                key={t.valor || 'todos'}
                style={[estilos.chip, ativo && estilos.chipAtivo]}
                onPress={() => setTipo(t.valor)}
              >
                <Text style={[estilos.chipTexto, ativo && estilos.chipTextoAtivo]}>{t.rotulo}</Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[estilos.chip, posicao && estilos.chipPerto]}
            onPress={posicao ? () => setPosicao(null) : irParaPerto}
          >
            <Text style={[estilos.chipTexto, posicao && estilos.chipTextoAtivo]}>
              {posicao ? 'Perto de mim ✕' : 'Perto de mim'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {posicao && (
          <View style={estilos.linhaRaio}>
            <Text style={estilos.raioTexto}>Raio:</Text>
            {[2, 5, 10, 25].map((r) => (
              <TouchableOpacity
                key={r}
                style={[estilos.chipPequeno, raio === r && estilos.chipAtivo]}
                onPress={() => setRaio(r)}
              >
                <Text style={[estilos.chipTexto, raio === r && estilos.chipTextoAtivo]}>{r} km</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={estilos.areaMapa}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', {
            ref: iframeRef,
            srcDoc: HTML_MAPA,
            title: 'Mapa',
            style: { border: 'none', width: '100%', height: '100%' },
          })
        ) : (
          <WebView
            ref={webRef}
            originWhitelist={['*']}
            source={{ html: HTML_MAPA, baseUrl: 'https://rewear-it.app' }}
            onMessage={(e) => tratarMensagem(e.nativeEvent.data)}
            javaScriptEnabled
            domStorageEnabled
            style={{ flex: 1 }}
          />
        )}

        {carregando && (
          <View style={estilos.carregando}>
            <ActivityIndicator color={CORES.roxo} />
          </View>
        )}

        {!!erro && (
          <View style={[estilos.aviso, { backgroundColor: '#FDECEA' }]}>
            <Text style={[estilos.avisoTexto, { color: '#B71C1C' }]}>{erro}</Text>
          </View>
        )}

        {!carregando && !erro && mapaPronto && lista.length === 0 && (
          <View style={estilos.aviso}>
            <Text style={estilos.avisoTexto}>Nenhum estabelecimento encontrado.</Text>
          </View>
        )}
      </View>

      {selecionado && (
        <View style={estilos.cartao}>
          <View style={estilos.cartaoCabecalho}>
            <View style={[estilos.selo, { backgroundColor: COR_TIPO[selecionado.tipo] || CORES.roxo }]}>
              <Text style={estilos.seloTexto}>{ROTULO_TIPO[selecionado.tipo] || selecionado.tipo}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelecionado(null)}>
              <Text style={estilos.fechar}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={estilos.cartaoCorpo}>
            {!!selecionado.foto_logo && (
              <Image
                source={{ uri: `${API_URL}/uploads/${selecionado.foto_logo}` }}
                style={estilos.logo}
              />
            )}
            <View style={{ flex: 1 }}>
              <Text style={estilos.cartaoNome}>{selecionado.nome}</Text>
              <Text style={estilos.cartaoLinha}>
                {selecionado.endereco}, {selecionado.cidade} - {selecionado.estado}
              </Text>
            </View>
          </View>

          {!!selecionado.descricao && (
            <Text style={estilos.cartaoLinha} numberOfLines={3}>{selecionado.descricao}</Text>
          )}
          {!!selecionado.horario_funcionamento && (
            <Text style={estilos.cartaoLinha}>🕒 {selecionado.horario_funcionamento}</Text>
          )}
          {!!selecionado.telefone && <Text style={estilos.cartaoLinha}>📞 {selecionado.telefone}</Text>}
          {!!distanciaTexto && <Text style={estilos.cartaoLinha}>📍 {distanciaTexto}</Text>}

          <TouchableOpacity style={estilos.botaoRota} onPress={() => abrirRota(selecionado)}>
            <Text style={estilos.textoBotao}>Traçar rota</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topo: { padding: 12, backgroundColor: '#F5F0FA' },
  linhaBusca: { flexDirection: 'row' },
  input: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12,
    height: 42, borderWidth: 1, borderColor: CORES.lilas, color: '#222', marginRight: 8,
  },
  botaoBusca: {
    backgroundColor: CORES.roxo, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center',
  },
  textoBotao: { color: '#fff', fontWeight: '700' },
  filtros: { marginTop: 10 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: CORES.lilas,
  },
  chipPequeno: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, marginRight: 6,
    backgroundColor: '#fff', borderWidth: 1, borderColor: CORES.lilas,
  },
  chipAtivo: { backgroundColor: CORES.roxo, borderColor: CORES.roxo },
  chipPerto: { backgroundColor: CORES.esmeralda, borderColor: CORES.esmeralda },
  chipTexto: { color: CORES.roxo, fontWeight: '600' },
  chipTextoAtivo: { color: '#fff' },
  linhaRaio: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  raioTexto: { marginRight: 8, color: '#444', fontWeight: '600' },
  areaMapa: { flex: 1 },
  carregando: {
    position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: '#fff',
    padding: 8, borderRadius: 20, elevation: 3,
  },
  aviso: {
    position: 'absolute', top: 10, left: 12, right: 12, backgroundColor: '#fff',
    padding: 10, borderRadius: 10, elevation: 3,
  },
  avisoTexto: { textAlign: 'center', color: '#444' },
  cartao: {
    position: 'absolute', left: 12, right: 12, bottom: 16, backgroundColor: '#fff',
    borderRadius: 16, padding: 16, elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  cartaoCabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selo: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  seloTexto: { color: '#fff', fontSize: 12, fontWeight: '700' },
  fechar: { fontSize: 18, color: '#666' },
  cartaoCorpo: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  logo: { width: 52, height: 52, borderRadius: 26, marginRight: 12, backgroundColor: '#eee' },
  cartaoNome: { fontSize: 18, fontWeight: '800', color: CORES.roxo },
  cartaoLinha: { color: '#444', marginTop: 4 },
  botaoRota: {
    backgroundColor: CORES.esmeralda, borderRadius: 10, paddingVertical: 11,
    alignItems: 'center', marginTop: 12,
  },
});