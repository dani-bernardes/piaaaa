import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from "react-native";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

const BASE_URL = "http://localhost:3000";

// Posição inicial: São Leopoldo
const POSICAO_INICIAL = [-29.7605, -51.1472];

// Atualiza o centro do mapa
function AtualizarCentro({ centro }) {
  const map = useMap();

  useEffect(() => {
    if (centro) {
      map.setView(centro, 14);
    }
  }, [centro, map]);

  return null;
}

export default function Mapa() {
  const [centro, setCentro] = useState(POSICAO_INICIAL);
  const [localizacao, setLocalizacao] = useState(null);

  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [resultadosOSM, setResultadosOSM] = useState([]);

  const [pesquisa, setPesquisa] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [buscando, setBuscando] = useState(false);

  const [rota, setRota] = useState([]);
  const [informacaoRota, setInformacaoRota] = useState("");

  // Carrega os estabelecimentos cadastrados no banco
  async function carregarEstabelecimentos() {
    try {
      const resposta = await fetch(
        `${BASE_URL}/estabelecimentos`
      );

      if (!resposta.ok) {
        throw new Error("Não foi possível carregar os estabelecimentos.");
      }

      const dados = await resposta.json();

      setEstabelecimentos(
        dados.filter((item) => {
          return (
            Number.isFinite(Number(item.latitude)) &&
            Number.isFinite(Number(item.longitude))
          );
        })
      );
    } catch (erro) {
      console.log("Erro ao carregar estabelecimentos:", erro);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarEstabelecimentos();
  }, []);

  // Obtém a localização do navegador
  function obterLocalizacao() {
    if (!navigator.geolocation) {
      Alert.alert(
        "Localização indisponível",
        "Seu navegador não suporta localização."
      );
      return;
    }

    setCarregando(true);

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const coordenadas = [
          posicao.coords.latitude,
          posicao.coords.longitude,
        ];

        setLocalizacao(coordenadas);
        setCentro(coordenadas);
        setCarregando(false);
      },
      (erro) => {
        console.log("Erro GPS:", erro);

        Alert.alert(
          "Erro de localização",
          "Não foi possível identificar sua localização. Verifique a permissão do navegador."
        );

        setCarregando(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  }

  // Calcula distância entre dois pontos
  function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;

    const rad = (valor) => (valor * Math.PI) / 180;

    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) *
        Math.cos(rad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return (
      R *
      2 *
      Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    );
  }

  // Pesquisa uma cidade pelo nome
  async function localizarCidade(cidade) {
    const resposta = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
        cidade
      )}`
    );

    if (!resposta.ok) {
      throw new Error("Não foi possível localizar a cidade.");
    }

    const dados = await resposta.json();

    if (!dados.length) {
      throw new Error("Cidade não encontrada.");
    }

    return [
      Number(dados[0].lat),
      Number(dados[0].lon),
    ];
  }

  // Pesquisa brechós no OpenStreetMap
  async function pesquisarOpenStreetMap(lat, lon) {
    const consulta =
      '[out:json][timeout:25];' +
      '(' +
      'nwr["shop"="second_hand"](around:8000,' +
      lat +
      "," +
      lon +
      ');' +
      'nwr["clothes"="second_hand"](around:8000,' +
      lat +
      "," +
      lon +
      ');' +
      ');out center tags;';

    const resposta = await fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "data=" + encodeURIComponent(consulta),
      }
    );

    if (!resposta.ok) {
      throw new Error("Serviço de pesquisa indisponível.");
    }

    const dados = await resposta.json();

    return (dados.elements || [])
      .map((item) => {
        const latitude = Number(
          item.lat ?? item.center?.lat
        );

        const longitude = Number(
          item.lon ?? item.center?.lon
        );

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return null;
        }

        const tags = item.tags || {};

        return {
          nome: tags.name || "Brechó sem nome",
          endereco:
            [
              tags["addr:street"],
              tags["addr:housenumber"],
              tags["addr:suburb"],
              tags["addr:city"],
            ]
              .filter(Boolean)
              .join(", ") || "Endereço não informado",
          latitude,
          longitude,
          distancia: calcularDistancia(
            lat,
            lon,
            latitude,
            longitude
          ),
          origem: "osm",
        };
      })
      .filter(Boolean);
  }

  // Pesquisa por nome ou cidade
  async function pesquisarBrechos() {
    if (buscando) return;

    setBuscando(true);
    setRota([]);
    setInformacaoRota("");
    setResultadosOSM([]);

    try {
      const texto = pesquisa.trim();

      let pontoPesquisa = localizacao || centro;
      let termo = texto;

      const cidadeMatch = texto.match(
        /\s+(?:em|na|no)\s+(.+)$/i
      );

      if (cidadeMatch) {
        pontoPesquisa = await localizarCidade(
          cidadeMatch[1].trim()
        );

        termo = texto
          .replace(/\s+(?:em|na|no)\s+.+$/i, "")
          .trim();

        setCentro(pontoPesquisa);
      }

      // Filtra os estabelecimentos do banco de dados
      const encontradosBanco = estabelecimentos
        .filter((item) => {
          const nome = String(item.nome || "").toLowerCase();
          const cidade = String(item.cidade || "").toLowerCase();
          const busca = termo.toLowerCase();

          return (
            !busca ||
            nome.includes(busca) ||
            cidade.includes(busca)
          );
        })
        .map((item) => ({
          ...item,
          latitude: Number(item.latitude),
          longitude: Number(item.longitude),
          origem: "banco",
          distancia: calcularDistancia(
            pontoPesquisa[0],
            pontoPesquisa[1],
            Number(item.latitude),
            Number(item.longitude)
          ),
        }));

      // Pesquisa também no OpenStreetMap
      const encontradosOSM = await pesquisarOpenStreetMap(
        pontoPesquisa[0],
        pontoPesquisa[1]
      );

      const termoGenerico = [
        "",
        "brechó",
        "brechós",
        "brecho",
        "brechos",
        "roupas",
        "lojas",
      ];

      const resultadosFiltrados = termoGenerico.includes(
        termo.toLowerCase()
      )
        ? encontradosOSM
        : encontradosOSM.filter((item) =>
            item.nome.toLowerCase().includes(termo.toLowerCase())
          );

      const ordenados = [
        ...encontradosBanco,
        ...resultadosFiltrados,
      ].sort((a, b) => a.distancia - b.distancia);

      setResultadosOSM(ordenados);

      if (!ordenados.length) {
        Alert.alert(
          "Nenhum resultado",
          "Não encontramos brechós com essa pesquisa."
        );
      }
    } catch (erro) {
      console.log("Erro na pesquisa:", erro);

      Alert.alert(
        "Erro na pesquisa",
        erro.message || "Não foi possível pesquisar."
      );
    } finally {
      setBuscando(false);
    }
  }

  // Calcula a rota entre usuário e estabelecimento
  async function tracarRota(destino) {
    if (!localizacao) {
      Alert.alert(
        "Localização necessária",
        "Ative sua localização antes de calcular uma rota."
      );
      return;
    }

    try {
      setInformacaoRota("Calculando rota...");

      const origem = localizacao;

      const url =
        "https://router.project-osrm.org/route/v1/driving/" +
        origem[1] +
        "," +
        origem[0] +
        ";" +
        destino.longitude +
        "," +
        destino.latitude +
        "?overview=full&geometries=geojson";

      const resposta = await fetch(url);

      if (!resposta.ok) {
        throw new Error("Não foi possível calcular a rota.");
      }

      const dados = await resposta.json();

      if (dados.code !== "Ok" || !dados.routes?.length) {
        throw new Error("Rota não encontrada.");
      }

      const caminho = dados.routes[0];

      const coordenadas = caminho.geometry.coordinates.map(
        ([longitude, latitude]) => [latitude, longitude]
      );

      setRota(coordenadas);

      const km = (caminho.distance / 1000).toFixed(1);
      const minutos = Math.ceil(caminho.duration / 60);

      setInformacaoRota(
        `Distância: ${km} km | Aproximadamente ${minutos} minutos de carro.`
      );
    } catch (erro) {
      setInformacaoRota("");

      Alert.alert(
        "Erro na rota",
        erro.message || "Não foi possível calcular a rota."
      );
    }
  }

  // Abre o destino no Google Maps
  async function abrirGoogleMaps(destino) {
    const url =
      `https://www.google.com/maps/dir/?api=1&destination=` +
      `${destino.latitude},${destino.longitude}`;

    try {
      await Linking.openURL(url);
    } catch (erro) {
      Alert.alert("Erro", "Não foi possível abrir o Google Maps.");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Rewear-it</Text>

        <Text style={styles.subtitulo}>
          Encontre brechós e ateliês perto de você
        </Text>
      </View>

      <View style={styles.areaPesquisa}>
        <TextInput
          style={styles.input}
          placeholder="Pesquisar brechó ou cidade..."
          value={pesquisa}
          onChangeText={setPesquisa}
          onSubmitEditing={pesquisarBrechos}
        />

        <TouchableOpacity
          style={styles.botaoBuscar}
          onPress={pesquisarBrechos}
          disabled={buscando}
        >
          <Text style={styles.textoBotao}>
            {buscando ? "..." : "Buscar"}
          </Text>
        </TouchableOpacity>
      </View>

      {informacaoRota !== "" && (
        <Text style={styles.infoRota}>
          {informacaoRota}
        </Text>
      )}

      <View style={styles.mapa}>
        <MapContainer
          center={POSICAO_INICIAL}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <AtualizarCentro centro={centro} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Localização do usuário */}
          {localizacao && (
            <CircleMarker
              center={localizacao}
              radius={9}
              pathOptions={{
                color: "#FFFFFF",
                fillColor: "#55C99A",
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Popup>Você está aqui!</Popup>
            </CircleMarker>
          )}

          {/* Estabelecimentos encontrados */}
          {resultadosOSM.map((item, index) => (
            <CircleMarker
              key={`${item.origem}-${item.id_estabelecimento || index}`}
              center={[item.latitude, item.longitude]}
              radius={8}
              pathOptions={{
                color: "#FFFFFF",
                fillColor:
                  item.origem === "banco"
                    ? "#7856C8"
                    : "#E69A45",
                fillOpacity: 1,
                weight: 2,
              }}
            >
              <Popup>
                <View style={{ width: 190 }}>
                  <Text style={styles.nomePopup}>
                    {item.nome}
                  </Text>

                  <Text>
                    {item.endereco ||
                      "Endereço não informado"}
                  </Text>

                  {item.cidade && (
                    <Text>{item.cidade}</Text>
                  )}

                  <Text>
                    Distância: {item.distancia.toFixed(1)} km
                  </Text>

                  <Text style={styles.origemPopup}>
                    {item.origem === "banco"
                      ? "Cadastrado no Rewear-it"
                      : "Encontrado no OpenStreetMap"}
                  </Text>

                  <TouchableOpacity
                    style={styles.botaoRota}
                    onPress={() => tracarRota(item)}
                  >
                    <Text style={styles.textoBotao}>
                      Calcular rota
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.botaoGoogle}
                    onPress={() => abrirGoogleMaps(item)}
                  >
                    <Text style={styles.textoBotao}>
                      Abrir no Google Maps
                    </Text>
                  </TouchableOpacity>
                </View>
              </Popup>
            </CircleMarker>
          ))}

          {/* Linha da rota */}
          {rota.length > 0 && (
            <Polyline
              positions={rota}
              pathOptions={{
                color: "#7856C8",
                weight: 5,
              }}
            />
          )}
        </MapContainer>
      </View>

      <View style={styles.rodape}>
        <TouchableOpacity
          style={styles.botaoGPS}
          onPress={obterLocalizacao}
        >
          <Text style={styles.textoBotao}>
            ◎ Minha localização
          </Text>
        </TouchableOpacity>
      </View>

      {carregando && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#7856C8" />
          <Text>Carregando mapa...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    padding: 18,
    paddingTop: 25,
  },

  titulo: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#7856C8",
  },

  subtitulo: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },

  areaPesquisa: {
    flexDirection: "row",
    paddingHorizontal: 15,
    gap: 8,
    marginBottom: 10,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },

  botaoBuscar: {
    backgroundColor: "#7856C8",
    paddingHorizontal: 18,
    justifyContent: "center",
    borderRadius: 10,
  },

  textoBotao: {
    color: "#FFFFFF",
    fontWeight: "bold",
    textAlign: "center",
  },

  mapa: {
    flex: 1,
    overflow: "hidden",
  },

  rodape: {
    padding: 12,
    alignItems: "center",
  },

  botaoGPS: {
    backgroundColor: "#7856C8",
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 25,
  },

  loading: {
    position: "absolute",
    top: "45%",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
    elevation: 5,
  },

  infoRota: {
    padding: 10,
    color: "#7856C8",
    textAlign: "center",
    fontWeight: "bold",
  },

  nomePopup: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#7856C8",
  },

  origemPopup: {
    fontSize: 11,
    color: "#777",
    marginTop: 5,
  },

  botaoRota: {
    backgroundColor: "#7856C8",
    padding: 9,
    borderRadius: 8,
    marginTop: 8,
  },

  botaoGoogle: {
    backgroundColor: "#55A987",
    padding: 9,
    borderRadius: 8,
    marginTop: 6,
  },
});