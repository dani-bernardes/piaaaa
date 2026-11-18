import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  Image,
  Platform,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const BASE = 'http://localhost:3000';

const TIPOS = { troca: 'Troca', venda: 'Venda', doacao: 'Doação' };

const STATUS = {
  disponivel: 'Disponível',
  reservado: 'Reservado',
  finalizado: 'Concluída',
};

const ACAO_CONCLUIR = {
  troca: 'Marcar como trocada',
  venda: 'Marcar como vendida',
  doacao: 'Marcar como doada',
};

const SEXOS = [
  { valor: 'F', rotulo: 'Feminino' },
  { valor: 'M', rotulo: 'Masculino' },
  { valor: 'O', rotulo: 'Outro' },
  { valor: '', rotulo: 'Não informar' },
];

const ESTAB_VAZIO = {
  nome: '',
  endereco: '',
  cidade: '',
  estado: '',
  telefone: '',
  email: '',
  site: '',
  descricao: '',
  horario_funcionamento: '',
  latitude: '',
  longitude: '',
};

function aviso(titulo, mensagem) {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
}

function confirmar(titulo, mensagem, textoOk, aoConfirmar) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensagem}`)) aoConfirmar();
  } else {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel' },
      { text: textoOk, style: 'destructive', onPress: aoConfirmar },
    ]);
  }
}

function mascaraData(texto) {
  const n = texto.replace(/\D/g, '').slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

function mascaraTelefone(texto) {
  const n = texto.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

// "AAAA-MM-DD" -> "DD/MM/AAAA"
function dataParaBR(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

// "DD/MM/AAAA" -> "AAAA-MM-DD" ('' se vazio, null se inválida)
function dataParaISO(br) {
  if (!br) return '';
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

export default function Perfil({ navigation, route }) {
  const usuarioParam = route.params?.usuario;
  const id = usuarioParam?.id_usuario;
  const tipoUsuario = usuarioParam?.tipo_usuario;

  const [tela, setTela] = useState('perfil');

  const [nome, setNome] = useState(usuarioParam?.nome || '');
  const [email, setEmail] = useState(usuarioParam?.email || '');
  const [foto, setFoto] = useState(usuarioParam?.foto_perfil || null);
  const [sexo, setSexo] = useState(usuarioParam?.sexo || '');
  const [nascimento, setNascimento] = useState(dataParaBR(usuarioParam?.data_nascimento));
  const [cidade, setCidade] = useState(usuarioParam?.cidade || '');
  const [telefone, setTelefone] = useState(usuarioParam?.telefone || '');

  const [novoNome, setNovoNome] = useState(usuarioParam?.nome || '');
  const [novoEmail, setNovoEmail] = useState(usuarioParam?.email || '');
  const [novoSexo, setNovoSexo] = useState('');
  const [novoNascimento, setNovoNascimento] = useState('');
  const [novaCidade, setNovaCidade] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');

  const [resumo, setResumo] = useState({
    trocas: 0,
    vendas: 0,
    doacoes: 0,
    publicadas: 0,
  });

  const [minhasRoupas, setMinhasRoupas] = useState([]);

  const [senhaExcluir, setSenhaExcluir] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  // Dados do estabelecimento
  const [estabelecimento, setEstabelecimento] = useState(ESTAB_VAZIO);
  const [idEstabelecimento, setIdEstabelecimento] = useState(null);
  const [buscandoLocal, setBuscandoLocal] = useState(false);

  const tema = {
    fundo: darkMode ? '#121212' : '#F5F5F5',
    card: darkMode ? '#1E1E1E' : '#FFFFFF',
    texto: darkMode ? '#FFFFFF' : '#222222',
    secundario: darkMode ? '#AAAAAA' : '#777777',
    borda: darkMode ? '#444444' : '#EEEEEE',
    roxo: '#7B4CC2',
    verde: '#2E7D32',
  };

  // ---------- carregar dados do banco ----------

  async function carregarDados() {
    if (!id) return;

    try {
      const [u, r, l] = await Promise.all([
        fetch(`${BASE}/usuarios/${id}`).then((x) => x.json()),
        fetch(`${BASE}/usuarios/${id}/resumo`).then((x) => x.json()),
        fetch(`${BASE}/usuarios/${id}/roupas`).then((x) => x.json()),
      ]);

      if (u && u.id_usuario) {
        setNome(u.nome);
        setEmail(u.email);
        setFoto(u.foto_perfil);
        setSexo(u.sexo || '');
        setNascimento(dataParaBR(u.data_nascimento));
        setCidade(u.cidade || '');
        setTelefone(u.telefone || '');
      }

      if (r && typeof r.trocas === 'number') setResumo(r);
      if (Array.isArray(l)) setMinhasRoupas(l);
    } catch (erro) {
      console.log('Erro ao carregar perfil:', erro);
    }

    carregarEstabelecimento();
  }

  async function carregarEstabelecimento() {
    if (!id || (tipoUsuario !== 'brecho' && tipoUsuario !== 'atelie')) return;

    try {
      const r = await fetch(`${BASE}/usuarios/${id}/estabelecimento`).then((x) => x.json());
      const e = r.estabelecimento;

      if (e) {
        setIdEstabelecimento(e.id_estabelecimento);
        setEstabelecimento({
          nome: e.nome || '',
          endereco: e.endereco || '',
          cidade: e.cidade || '',
          estado: e.estado || '',
          telefone: e.telefone || '',
          email: e.email || '',
          site: e.site || '',
          descricao: e.descricao || '',
          horario_funcionamento: e.horario_funcionamento || '',
          latitude: e.latitude != null ? String(e.latitude) : '',
          longitude: e.longitude != null ? String(e.longitude) : '',
        });
      } else {
        setIdEstabelecimento(null);
      }
    } catch (erro) {
      console.log('Erro ao carregar estabelecimento:', erro);
    }
  }

  useEffect(() => {
    carregarDados();

    const unsubscribe = navigation.addListener('focus', carregarDados);
    return unsubscribe;
  }, [navigation]);

  // ---------- estabelecimento ----------

  function atualizarEstabelecimento(campo, valor) {
    setEstabelecimento((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  async function usarMinhaLocalizacao() {
    setBuscandoLocal(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        aviso('Permissão necessária', 'Permita o acesso à localização para usar o GPS.');
        return;
      }

      const atual = await Location.getCurrentPositionAsync({});

      setEstabelecimento((anterior) => ({
        ...anterior,
        latitude: atual.coords.latitude.toFixed(6),
        longitude: atual.coords.longitude.toFixed(6),
      }));
    } catch (erro) {
      console.log(erro);
      aviso('Erro', 'Não foi possível obter a sua localização.');
    } finally {
      setBuscandoLocal(false);
    }
  }

  async function buscarCoordenadasPeloEndereco() {
    const { endereco, cidade: cidadeEstab, estado } = estabelecimento;

    if (!endereco.trim() || !cidadeEstab.trim()) {
      aviso('Atenção', 'Preencha o endereço e a cidade primeiro.');
      return;
    }

    setBuscandoLocal(true);

    try {
      const consulta = [endereco, cidadeEstab, estado, 'Brasil'].filter(Boolean).join(', ');
      const url =
        'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' +
        encodeURIComponent(consulta);

      const resposta = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
      const lista = await resposta.json();

      if (!Array.isArray(lista) || lista.length === 0) {
        aviso('Não encontrado', 'Não achei esse endereço. Tente sem o bairro ou use o GPS.');
        return;
      }

      setEstabelecimento((anterior) => ({
        ...anterior,
        latitude: Number(lista[0].lat).toFixed(6),
        longitude: Number(lista[0].lon).toFixed(6),
      }));

      aviso('Localização encontrada', lista[0].display_name);
    } catch (erro) {
      console.log(erro);
      aviso('Erro', 'Não foi possível buscar o endereço agora.');
    } finally {
      setBuscandoLocal(false);
    }
  }

  async function salvarEstabelecimento() {
    const latitude = Number(String(estabelecimento.latitude).trim().replace(',', '.'));
    const longitude = Number(String(estabelecimento.longitude).trim().replace(',', '.'));

    if (!id) {
      aviso('Erro', 'Não foi possível identificar o usuário logado.');
      return;
    }

    if (tipoUsuario !== 'brecho' && tipoUsuario !== 'atelie') {
      aviso('Atenção', 'Apenas contas de brechó e ateliê podem realizar esse cadastro.');
      return;
    }

    if (
      !estabelecimento.nome.trim() ||
      !estabelecimento.endereco.trim() ||
      !estabelecimento.cidade.trim()
    ) {
      aviso('Atenção', 'Preencha nome, endereço e cidade.');
      return;
    }

    if (!/^[A-Za-z]{2}$/.test(estabelecimento.estado.trim())) {
      aviso('Atenção', 'Informe o estado com 2 letras (ex.: RS).');
      return;
    }

    if (
      !String(estabelecimento.latitude).trim() ||
      !String(estabelecimento.longitude).trim() ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      aviso('Atenção', 'Defina a localização: use o GPS ou busque pelo endereço.');
      return;
    }

    const editando = idEstabelecimento !== null;

    try {
      const resposta = await fetch(
        editando
          ? `${BASE}/estabelecimentos/${idEstabelecimento}`
          : `${BASE}/estabelecimentos`,
        {
          method: editando ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_usuario: id,
            tipo: tipoUsuario,
            nome: estabelecimento.nome.trim(),
            endereco: estabelecimento.endereco,
            cidade: estabelecimento.cidade,
            estado: estabelecimento.estado,
            telefone: estabelecimento.telefone,
            email: estabelecimento.email,
            site: estabelecimento.site,
            descricao: estabelecimento.descricao,
            horario_funcionamento: estabelecimento.horario_funcionamento,
            latitude,
            longitude,
          }),
        }
      );

      const dados = await resposta.json();

      if (resposta.ok && dados.sucesso) {
        aviso(
          'Sucesso',
          editando
            ? 'Estabelecimento atualizado!'
            : 'Seu estabelecimento foi cadastrado no mapa!'
        );

        await carregarEstabelecimento();
        setTela('perfil');
      } else {
        aviso('Erro', dados.mensagem || 'Não foi possível salvar o estabelecimento.');
      }
    } catch (erro) {
      console.log('Erro ao salvar estabelecimento:', erro);
      aviso('Erro', 'Não foi possível conectar ao servidor.');
    }
  }

  function removerEstabelecimento() {
    confirmar(
      'Remover do mapa',
      'Seu estabelecimento deixará de aparecer no mapa.',
      'Remover',
      async () => {
        try {
          const resposta = await fetch(`${BASE}/estabelecimentos/${idEstabelecimento}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: id }),
          });

          const dados = await resposta.json();

          if (resposta.ok && dados.sucesso) {
            setIdEstabelecimento(null);
            setEstabelecimento(ESTAB_VAZIO);
            aviso('Pronto', 'Estabelecimento removido do mapa.');
            setTela('perfil');
          } else {
            aviso('Erro', dados.mensagem || 'Não foi possível remover.');
          }
        } catch (erro) {
          console.log(erro);
          aviso('Erro', 'Não foi possível conectar ao servidor.');
        }
      }
    );
  }

  // ---------- foto de perfil ----------

  async function escolherFoto() {
    try {
      const permissao =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissao.granted) {
        aviso(
          'Permissão necessária',
          'Precisamos acessar sua galeria para escolher uma foto.'
        );
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (resultado.canceled) return;

      const asset = resultado.assets[0];
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const blob = await (await fetch(asset.uri)).blob();
        formData.append('foto', blob, 'perfil.jpg');
      } else {
        formData.append('foto', {
          uri: asset.uri,
          name: 'perfil.jpg',
          type: asset.mimeType || 'image/jpeg',
        });
      }

      const resposta = await fetch(`${BASE}/usuarios/${id}/foto`, {
        method: 'POST',
        body: formData,
      });

      const dados = await resposta.json();

      if (resposta.ok && dados.sucesso) {
        setFoto(dados.foto);
        aviso('Sucesso', 'Foto atualizada!');
      } else {
        aviso('Erro', dados.mensagem || 'Não foi possível salvar a foto.');
      }
    } catch (erro) {
      console.log(erro);
      aviso('Erro', 'Não foi possível enviar a foto.');
    }
  }

  // ---------- editar perfil ----------

  async function salvarPerfil() {
    if (!novoNome.trim() || !novoEmail.trim()) {
      aviso('Atenção', 'Preencha nome e email.');
      return;
    }

    const nascimentoISO = dataParaISO(novoNascimento);

    if (nascimentoISO === null) {
      aviso('Atenção', 'Informe a data de nascimento como DD/MM/AAAA.');
      return;
    }

    try {
      const resposta = await fetch(`${BASE}/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novoNome,
          email: novoEmail,
          sexo: novoSexo,
          data_nascimento: nascimentoISO,
          cidade: novaCidade,
          telefone: novoTelefone,
        }),
      });

      const dados = await resposta.json();

      if (resposta.ok && dados.sucesso) {
        setNome(dados.data.nome);
        setEmail(dados.data.email);
        setSexo(dados.data.sexo || '');
        setNascimento(dataParaBR(dados.data.data_nascimento));
        setCidade(dados.data.cidade || '');
        setTelefone(dados.data.telefone || '');
        aviso('Sucesso', 'Seu perfil foi atualizado!');
        setTela('perfil');
      } else {
        aviso('Erro', dados.mensagem || 'Não foi possível atualizar.');
      }
    } catch (erro) {
      console.log(erro);
      aviso('Erro', 'Não foi possível conectar ao servidor.');
    }
  }

  // ---------- concluir roupa ----------

  async function concluirRoupa(roupa) {
    try {
      const resposta = await fetch(`${BASE}/roupas/${roupa.id_roupa}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario: id, status: 'finalizado' }),
      });

      const dados = await resposta.json();

      if (resposta.ok && dados.sucesso) {
        carregarDados();
      } else {
        aviso('Erro', dados.mensagem || 'Não foi possível atualizar.');
      }
    } catch (erro) {
      console.log(erro);
      aviso('Erro', 'Não foi possível conectar ao servidor.');
    }
  }

  // ---------- sair e excluir conta ----------

  function irParaInicio() {
    navigation.reset({
      index: 0,
      routes: [{ name: 'telainicial' }],
    });
  }

  function sair() {
    confirmar(
      'Sair da conta',
      'Deseja realmente sair do aplicativo?',
      'Sair',
      irParaInicio
    );
  }

  function excluirConta() {
    if (!senhaExcluir.trim()) {
      aviso('Atenção', 'Digite sua senha para confirmar.');
      return;
    }

    confirmar(
      'Excluir conta',
      'Isso apaga sua conta e todas as suas roupas. Essa ação não pode ser desfeita.',
      'Excluir',
      async () => {
        try {
          const resposta = await fetch(`${BASE}/usuarios/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha: senhaExcluir }),
          });

          const dados = await resposta.json();

          if (resposta.ok && dados.sucesso) {
            aviso('Conta excluída', 'Sua conta foi removida.');
            irParaInicio();
          } else {
            aviso('Erro', dados.mensagem || 'Não foi possível excluir a conta.');
          }
        } catch (erro) {
          console.log(erro);
          aviso('Erro', 'Não foi possível conectar ao servidor.');
        }
      }
    );
  }

  function voltar() {
    setSenhaExcluir('');
    setTela('perfil');
  }

  // ---------- avatar ----------

  function renderAvatar(tamanho = 90) {
    return (
      <View
        style={[
          styles.avatar,
          { width: tamanho, height: tamanho, borderRadius: tamanho / 2 },
        ]}
      >
        {foto ? (
          <Image
            source={{ uri: `${BASE}/uploads/${foto}` }}
            style={styles.imagemPerfil}
          />
        ) : (
          <Text style={styles.avatarTexto}>
            {nome ? nome[0].toUpperCase() : 'U'}
          </Text>
        )}
      </View>
    );
  }

  // ---------- tela principal do perfil ----------

  if (tela === 'perfil') {
    const rotuloSexo = SEXOS.find((s) => s.valor && s.valor === sexo)?.rotulo;

    return (
      <View style={[styles.container, { backgroundColor: tema.fundo }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.topo}>
            <Text style={styles.topoTitulo}>Seu perfil</Text>

            {renderAvatar(80)}

            <Text style={styles.nome}>{nome}</Text>
            <Text style={styles.email}>{email}</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statsRoxo}>
              <Text style={styles.numero}>{resumo.trocas}</Text>
              <Text style={styles.statsTexto}>Trocas</Text>
            </View>

            <View style={styles.statsVerde}>
              <Text style={styles.numero}>{resumo.vendas}</Text>
              <Text style={styles.statsTexto}>Vendas</Text>
            </View>

            <View style={styles.statsRoxo}>
              <Text style={styles.numero}>{resumo.doacoes}</Text>
              <Text style={styles.statsTexto}>Doações</Text>
            </View>
          </View>

          <Text style={[styles.resumoTexto, { color: tema.secundario }]}>
            {resumo.publicadas} peça(s) publicada(s) no total
          </Text>

          <View style={[styles.cardDados, { backgroundColor: tema.card }]}>
            <Text style={[styles.cardDadosTitulo, { color: tema.texto }]}>
              Meus dados
            </Text>

            <Text style={[styles.dadoLinha, { color: tema.secundario }]}>
              Sexo: {rotuloSexo || 'Não informado'}
            </Text>
            <Text style={[styles.dadoLinha, { color: tema.secundario }]}>
              Nascimento: {nascimento || 'Não informado'}
            </Text>
            <Text style={[styles.dadoLinha, { color: tema.secundario }]}>
              Cidade: {cidade || 'Não informada'}
            </Text>
            <Text style={[styles.dadoLinha, { color: tema.secundario }]}>
              Telefone: {telefone || 'Não informado'}
            </Text>
          </View>

          <View style={styles.menu}>
            <TouchableOpacity
              style={[styles.opcao, { backgroundColor: tema.card }]}
              onPress={() => setTela('minhasRoupas')}
            >
              <Text style={styles.textoConfig}>Minhas roupas</Text>
              <Text style={styles.iconeConfig}>☰</Text>
            </TouchableOpacity>

            {(tipoUsuario === 'brecho' || tipoUsuario === 'atelie') && (
              <TouchableOpacity
                style={[styles.opcao, { backgroundColor: tema.card }]}
                onPress={() => setTela('cadastrarEstabelecimento')}
              >
                <Text style={styles.textoConfig}>
                  {idEstabelecimento !== null
                    ? 'Meu estabelecimento'
                    : 'Cadastrar meu estabelecimento'}
                </Text>
                <Text style={styles.iconeConfig}>📍</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.opcao, { backgroundColor: tema.card }]}
              onPress={() => {
                setNovoNome(nome);
                setNovoEmail(email);
                setNovoSexo(sexo);
                setNovoNascimento(nascimento);
                setNovaCidade(cidade);
                setNovoTelefone(telefone);
                setTela('editar');
              }}
            >
              <Text style={styles.textoEditar}>Editar perfil</Text>
              <Text style={styles.iconeEditar}>♙</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.opcao, { backgroundColor: tema.card }]}
              onPress={() => setTela('configuracoes')}
            >
              <Text style={styles.textoConfig}>Configurações</Text>
              <Text style={styles.iconeConfig}>⚙</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.opcao, { backgroundColor: tema.card }]}
              onPress={() => setTela('ajuda')}
            >
              <Text style={styles.textoAjuda}>Ajuda</Text>
              <Text style={styles.iconeAjuda}>ⓘ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.opcao, { backgroundColor: tema.card }]}
              onPress={sair}
            >
              <Text style={[styles.textoSair, { color: tema.texto }]}>
                Sair
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.opcao,
                styles.opcaoPerigo,
                { backgroundColor: tema.card },
              ]}
              onPress={() => setTela('excluir')}
            >
              <Text style={styles.textoPerigo}>Excluir conta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------- cadastro / edição do estabelecimento ----------

  if (tela === 'cadastrarEstabelecimento') {
    const campos = [
      { chave: 'nome', titulo: 'Nome do estabelecimento', placeholder: 'Ex.: Brechó Rewear' },
      { chave: 'endereco', titulo: 'Endereço', placeholder: 'Rua, número e bairro' },
      { chave: 'cidade', titulo: 'Cidade', placeholder: 'Ex.: Porto Alegre' },
    ];

    const camposContato = [
      { chave: 'telefone', titulo: 'Telefone', placeholder: '(51) 99999-9999' },
      { chave: 'email', titulo: 'Email', placeholder: 'contato@email.com' },
      { chave: 'site', titulo: 'Site ou rede social', placeholder: 'Link do estabelecimento' },
      {
        chave: 'horario_funcionamento',
        titulo: 'Horário de funcionamento',
        placeholder: 'Ex.: Segunda a sexta, das 9h às 18h',
      },
    ];

    const estiloInput = [
      styles.input,
      { color: tema.texto, borderColor: tema.borda, backgroundColor: tema.fundo },
    ];

    return (
      <ScrollView
        style={{ backgroundColor: tema.fundo }}
        contentContainerStyle={styles.conteudo}
      >
        <Text style={styles.titulo}>
          {idEstabelecimento !== null ? 'Meu estabelecimento' : 'Cadastrar estabelecimento'}
        </Text>

        <View style={[styles.card, { backgroundColor: tema.card }]}>
          <Text style={[styles.descricao, { color: tema.secundario }]}>
            Cadastre seu brechó ou ateliê para que ele apareça no mapa do Rewear-it.
          </Text>

          <Text style={[styles.label, { color: tema.texto }]}>
            Tipo de estabelecimento
          </Text>

          <View style={estiloInput}>
            <Text style={{ color: tema.texto }}>
              {tipoUsuario === 'brecho' ? 'Brechó' : 'Ateliê'}
            </Text>
          </View>

          {campos.map((campo) => (
            <View key={campo.chave}>
              <Text style={[styles.label, { color: tema.texto }]}>
                {campo.titulo}
              </Text>

              <TextInput
                style={estiloInput}
                value={estabelecimento[campo.chave]}
                onChangeText={(valor) => atualizarEstabelecimento(campo.chave, valor)}
                placeholder={campo.placeholder}
                placeholderTextColor="#999"
              />
            </View>
          ))}

          <Text style={[styles.label, { color: tema.texto }]}>Estado (sigla)</Text>

          <TextInput
            style={estiloInput}
            value={estabelecimento.estado}
            onChangeText={(valor) => atualizarEstabelecimento('estado', valor.toUpperCase())}
            placeholder="Ex.: RS"
            placeholderTextColor="#999"
            maxLength={2}
            autoCapitalize="characters"
          />

          <Text style={[styles.label, { color: tema.texto }]}>
            Localização no mapa
          </Text>

          <Text style={[styles.descricao, { color: tema.secundario, marginBottom: 12 }]}>
            Busque pelo endereço acima ou use o GPS se você estiver no local.
          </Text>

          <TouchableOpacity
            style={styles.botaoSecundario}
            onPress={buscarCoordenadasPeloEndereco}
            disabled={buscandoLocal}
          >
            <Text style={styles.botaoSecundarioTexto}>
              {buscandoLocal ? 'Buscando...' : '🔎 Buscar pelo endereço'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botaoSecundario}
            onPress={usarMinhaLocalizacao}
            disabled={buscandoLocal}
          >
            <Text style={styles.botaoSecundarioTexto}>
              📍 Usar minha localização (GPS)
            </Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: tema.texto }]}>Latitude</Text>

          <TextInput
            style={estiloInput}
            value={estabelecimento.latitude}
            onChangeText={(valor) => atualizarEstabelecimento('latitude', valor)}
            placeholder="Ex.: -30.0368"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />

          <Text style={[styles.label, { color: tema.texto }]}>Longitude</Text>

          <TextInput
            style={estiloInput}
            value={estabelecimento.longitude}
            onChangeText={(valor) => atualizarEstabelecimento('longitude', valor)}
            placeholder="Ex.: -51.2172"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />

          {camposContato.map((campo) => (
            <View key={campo.chave}>
              <Text style={[styles.label, { color: tema.texto }]}>
                {campo.titulo}
              </Text>

              <TextInput
                style={estiloInput}
                value={estabelecimento[campo.chave]}
                onChangeText={(valor) => atualizarEstabelecimento(campo.chave, valor)}
                placeholder={campo.placeholder}
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>
          ))}

          <Text style={[styles.label, { color: tema.texto }]}>Descrição</Text>

          <TextInput
            style={[estiloInput, { minHeight: 90, textAlignVertical: 'top' }]}
            value={estabelecimento.descricao}
            onChangeText={(valor) => atualizarEstabelecimento('descricao', valor)}
            placeholder="Conte um pouco sobre seu estabelecimento"
            placeholderTextColor="#999"
            multiline
          />

          <TouchableOpacity style={styles.botao} onPress={salvarEstabelecimento}>
            <Text style={styles.botaoTexto}>
              {idEstabelecimento !== null ? 'Salvar alterações' : 'Cadastrar no mapa'}
            </Text>
          </TouchableOpacity>

          {idEstabelecimento !== null && (
            <TouchableOpacity
              style={styles.botaoRemover}
              onPress={removerEstabelecimento}
            >
              <Text style={styles.botaoRemoverTexto}>Remover do mapa</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.botaoVoltar} onPress={voltar}>
          <Text style={{ color: tema.texto }}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ---------- minhas roupas ----------

  if (tela === 'minhasRoupas') {
    return (
      <ScrollView
        style={{ backgroundColor: tema.fundo }}
        contentContainerStyle={styles.conteudo}
      >
        <Text style={styles.titulo}>Minhas roupas</Text>

        {minhasRoupas.length === 0 && (
          <Text style={{ color: tema.secundario, marginBottom: 20 }}>
            Você ainda não publicou nenhuma peça.
          </Text>
        )}

        {minhasRoupas.map((roupa) => (
          <View
            key={roupa.id_roupa}
            style={[
              styles.card,
              styles.linhaRoupa,
              { backgroundColor: tema.card },
            ]}
          >
            {roupa.foto ? (
              <Image
                source={{ uri: `${BASE}/uploads/${roupa.foto}` }}
                style={styles.miniatura}
              />
            ) : (
              <View style={[styles.miniatura, styles.semFoto]}>
                <Text style={{ color: '#BBB' }}>—</Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={[styles.roupaTitulo, { color: tema.texto }]}>
                {roupa.titulo}
              </Text>

              <Text style={{ color: tema.secundario, marginTop: 2 }}>
                {TIPOS[roupa.tipo_oferta]} · {STATUS[roupa.status] || roupa.status}
              </Text>

              {roupa.status !== 'finalizado' && (
                <TouchableOpacity
                  style={styles.botaoConcluir}
                  onPress={() => concluirRoupa(roupa)}
                >
                  <Text style={styles.botaoConcluirTexto}>
                    {ACAO_CONCLUIR[roupa.tipo_oferta]}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.botaoVoltar} onPress={voltar}>
          <Text style={{ color: tema.texto }}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ---------- editar perfil ----------

  if (tela === 'editar') {
    const estiloInput = [
      styles.input,
      { color: tema.texto, borderColor: tema.borda, backgroundColor: tema.fundo },
    ];

    return (
      <ScrollView
        style={{ backgroundColor: tema.fundo }}
        contentContainerStyle={styles.conteudo}
      >
        <Text style={styles.titulo}>Editar perfil</Text>

        <View style={[styles.card, { backgroundColor: tema.card }]}>
          <TouchableOpacity style={styles.areaFoto} onPress={escolherFoto}>
            {renderAvatar(100)}

            <Text style={styles.textoFoto}>Alterar foto de perfil</Text>
            <Text style={styles.textoFotoSecundario}>
              Escolha uma imagem da galeria
            </Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: tema.texto }]}>
            Nome completo
          </Text>

          <TextInput
            style={estiloInput}
            value={novoNome}
            onChangeText={setNovoNome}
            placeholder="Digite seu nome"
            placeholderTextColor="#999"
          />

          <Text style={[styles.label, { color: tema.texto }]}>Email</Text>

          <TextInput
            style={estiloInput}
            value={novoEmail}
            onChangeText={setNovoEmail}
            placeholder="Digite seu email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: tema.texto }]}>Sexo</Text>

          <View style={styles.chipsLinha}>
            {SEXOS.map((s) => {
              const ativo = novoSexo === s.valor;

              return (
                <TouchableOpacity
                  key={s.rotulo}
                  style={[styles.chip, ativo && styles.chipAtivo]}
                  onPress={() => setNovoSexo(s.valor)}
                >
                  <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
                    {s.rotulo}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: tema.texto }]}>
            Data de nascimento
          </Text>

          <TextInput
            style={estiloInput}
            value={novoNascimento}
            onChangeText={(valor) => setNovoNascimento(mascaraData(valor))}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={[styles.label, { color: tema.texto }]}>Cidade</Text>

          <TextInput
            style={estiloInput}
            value={novaCidade}
            onChangeText={setNovaCidade}
            placeholder="Ex.: Porto Alegre"
            placeholderTextColor="#999"
          />

          <Text style={[styles.label, { color: tema.texto }]}>Telefone</Text>

          <TextInput
            style={estiloInput}
            value={novoTelefone}
            onChangeText={(valor) => setNovoTelefone(mascaraTelefone(valor))}
            placeholder="(51) 99999-9999"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            maxLength={15}
          />

          <TouchableOpacity style={styles.botao} onPress={salvarPerfil}>
            <Text style={styles.botaoTexto}>Salvar alterações</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.botaoVoltar} onPress={voltar}>
          <Text style={{ color: tema.texto }}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ---------- configurações ----------

  if (tela === 'configuracoes') {
    return (
      <View style={[styles.conteudo, { backgroundColor: tema.fundo }]}>
        <Text style={styles.titulo}>Configurações</Text>

        <View style={[styles.card, { backgroundColor: tema.card }]}>
          <View style={styles.linha}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: tema.texto }]}>
                Modo escuro
              </Text>
              <Text style={{ color: tema.secundario }}>
                Ativar tema escuro do aplicativo
              </Text>
            </View>

            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#CCC', true: '#7B4CC2' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.botaoVoltar} onPress={voltar}>
          <Text style={{ color: tema.texto }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------- ajuda ----------

  if (tela === 'ajuda') {
    return (
      <ScrollView
        style={{ backgroundColor: tema.fundo }}
        contentContainerStyle={styles.conteudo}
      >
        <Text style={styles.titulo}>Ajuda</Text>

        <View style={[styles.card, { backgroundColor: tema.card }]}>
          <Text style={[styles.label, { color: tema.texto }]}>
            Precisa de ajuda?
          </Text>

          <Text style={[styles.descricao, { color: tema.secundario }]}>
            Estamos aqui para ajudar você a utilizar o Rewear-it!
          </Text>

          <Text style={[styles.label, { color: tema.texto }]}>
            Dúvidas frequentes
          </Text>

          <Text style={[styles.descricao, { color: tema.secundario }]}>
            • Como realizar uma troca?
            {'\n\n'}
            • Como publicar uma roupa para venda?
            {'\n\n'}
            • Como fazer uma doação?
            {'\n\n'}
            • Como editar meus dados?
          </Text>

          <Text style={[styles.label, { color: tema.texto }]}>
            Contato do suporte
          </Text>

          <Text style={{ color: '#2E7D32' }}>
            suporte@rewearit.com
          </Text>
        </View>

        <TouchableOpacity style={styles.botaoVoltar} onPress={voltar}>
          <Text style={{ color: tema.texto }}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ---------- excluir conta ----------

  if (tela === 'excluir') {
    return (
      <ScrollView
        style={{ backgroundColor: tema.fundo }}
        contentContainerStyle={styles.conteudo}
      >
        <Text style={[styles.titulo, { color: '#C62828' }]}>
          Excluir conta
        </Text>

        <View style={[styles.card, { backgroundColor: tema.card }]}>
          <Text style={[styles.descricao, { color: tema.secundario }]}>
            Ao excluir sua conta, todos os seus dados e todas as roupas que você
            publicou serão apagados. Essa ação não pode ser desfeita.
          </Text>

          <Text style={[styles.label, { color: tema.texto }]}>
            Digite sua senha para confirmar
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                color: tema.texto,
                borderColor: tema.borda,
                backgroundColor: tema.fundo,
              },
            ]}
            value={senhaExcluir}
            onChangeText={setSenhaExcluir}
            placeholder="Sua senha"
            placeholderTextColor="#999"
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.botaoExcluir}
            onPress={excluirConta}
          >
            <Text style={styles.botaoTexto}>Excluir minha conta</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.botaoVoltar} onPress={voltar}>
          <Text style={{ color: tema.texto }}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  topo: {
    backgroundColor: '#50358C',
    alignItems: 'center',
    paddingTop: 15,
    paddingBottom: 20,
  },

  topoTitulo: {
    color: '#FFF',
    fontSize: 16,
    alignSelf: 'flex-start',
    marginLeft: 15,
    marginBottom: 15,
  },

  avatar: {
    backgroundColor: '#E9DFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },

  avatarTexto: {
    fontSize: 30,
    color: '#50358C',
    fontWeight: 'bold',
  },

  imagemPerfil: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  nome: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },

  email: {
    color: '#EEE',
    fontSize: 11,
    marginTop: 4,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 18,
    marginBottom: 8,
  },

  statsRoxo: {
    backgroundColor: '#6844A5',
    width: '29%',
    padding: 13,
    borderRadius: 10,
    alignItems: 'center',
  },

  statsVerde: {
    backgroundColor: '#13B76B',
    width: '29%',
    padding: 13,
    borderRadius: 10,
    alignItems: 'center',
  },

  numero: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  statsTexto: {
    color: '#FFF',
    fontSize: 10,
    marginTop: 4,
  },

  resumoTexto: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 14,
  },

  cardDados: {
    marginHorizontal: 18,
    marginBottom: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },

  cardDadosTitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  dadoLinha: {
    fontSize: 12,
    marginTop: 4,
  },

  menu: {
    paddingHorizontal: 18,
    gap: 12,
    paddingBottom: 25,
  },

  opcao: {
    padding: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  opcaoPerigo: {
    borderColor: '#F3C4C4',
  },

  textoEditar: {
    color: '#2EAE71',
    fontSize: 12,
  },

  textoConfig: {
    color: '#9274D5',
    fontSize: 12,
  },

  textoAjuda: {
    color: '#20B878',
    fontSize: 12,
  },

  textoPerigo: {
    color: '#C62828',
    fontSize: 12,
    textAlign: 'center',
    width: '100%',
  },

  iconeEditar: {
    color: '#13B76B',
    fontSize: 20,
  },

  iconeConfig: {
    color: '#50358C',
    fontSize: 20,
  },

  iconeAjuda: {
    color: '#13B76B',
    fontSize: 20,
  },

  textoSair: {
    fontSize: 12,
    textAlign: 'center',
    width: '100%',
  },

  conteudo: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 45,
  },

  titulo: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#7B4CC2',
    marginBottom: 25,
  },

  card: {
    padding: 20,
    borderRadius: 18,
    marginBottom: 20,
    elevation: 2,
  },

  linhaRoupa: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
  },

  miniatura: {
    width: 70,
    height: 80,
    borderRadius: 10,
    marginRight: 12,
  },

  semFoto: {
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  roupaTitulo: {
    fontSize: 15,
    fontWeight: 'bold',
  },

  botaoConcluir: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#E9DFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },

  botaoConcluirTexto: {
    color: '#50358C',
    fontSize: 12,
    fontWeight: 'bold',
  },

  areaFoto: {
    alignItems: 'center',
    marginBottom: 25,
  },

  textoFoto: {
    color: '#7B4CC2',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },

  textoFotoSecundario: {
    color: '#999',
    fontSize: 11,
    marginTop: 4,
  },

  label: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },

  chipsLinha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B39DDB',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFF',
  },

  chipAtivo: {
    backgroundColor: '#7B4CC2',
    borderColor: '#7B4CC2',
  },

  chipTexto: {
    color: '#7B4CC2',
    fontSize: 13,
    fontWeight: '600',
  },

  chipTextoAtivo: {
    color: '#FFF',
  },

  botao: {
    backgroundColor: '#7B4CC2',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },

  botaoSecundario: {
    borderWidth: 1,
    borderColor: '#7B4CC2',
    padding: 13,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 12,
  },

  botaoSecundarioTexto: {
    color: '#7B4CC2',
    fontWeight: 'bold',
  },

  botaoRemover: {
    borderWidth: 1,
    borderColor: '#C62828',
    padding: 13,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 12,
  },

  botaoRemoverTexto: {
    color: '#C62828',
    fontWeight: 'bold',
  },

  botaoExcluir: {
    backgroundColor: '#C62828',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },

  botaoTexto: {
    color: '#FFF',
    fontWeight: 'bold',
  },

  botaoVoltar: {
    borderWidth: 1,
    borderColor: '#CCC',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },

  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  descricao: {
    fontSize: 14,
    lineHeight: 23,
    marginBottom: 22,
  },
});