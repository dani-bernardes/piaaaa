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

// Alert.alert não funciona no navegador, então usamos window.alert / confirm na web
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

export default function Perfil({ navigation, route }) {
  const usuarioParam = route.params?.usuario;
  const id = usuarioParam?.id_usuario;

  const [tela, setTela] = useState('perfil');

  const [nome, setNome] = useState(usuarioParam?.nome || '');
  const [email, setEmail] = useState(usuarioParam?.email || '');
  const [foto, setFoto] = useState(usuarioParam?.foto_perfil || null);

  const [novoNome, setNovoNome] = useState(usuarioParam?.nome || '');
  const [novoEmail, setNovoEmail] = useState(usuarioParam?.email || '');

  const [resumo, setResumo] = useState({
    trocas: 0,
    vendas: 0,
    doacoes: 0,
    publicadas: 0,
  });
  const [minhasRoupas, setMinhasRoupas] = useState([]);

  const [senhaExcluir, setSenhaExcluir] = useState('');
  const [darkMode, setDarkMode] = useState(false);

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
      }

      if (r && typeof r.trocas === 'number') setResumo(r);
      if (Array.isArray(l)) setMinhasRoupas(l);
    } catch (erro) {
      console.log('Erro ao carregar perfil:', erro);
    }
  }

  useEffect(() => {
    carregarDados();

    const unsubscribe = navigation.addListener('focus', carregarDados);
    return unsubscribe;
  }, [navigation]);

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
        mediaTypes: ['images'], // em SDK antigo: ImagePicker.MediaTypeOptions.Images
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


  async function salvarPerfil() {
    if (!novoNome.trim() || !novoEmail.trim()) {
      aviso('Atenção', 'Preencha todos os campos.');
      return;
    }

    try {
      const resposta = await fetch(`${BASE}/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoNome, email: novoEmail }),
      });

      const dados = await resposta.json();

      if (resposta.ok && dados.sucesso) {
        setNome(dados.data.nome);
        setEmail(dados.data.email);
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


  function irParaInicio() {
    navigation.reset({
      index: 0,
      routes: [{ name: 'telainicial' }],
    });
  }

  function sair() {
    confirmar('Sair da conta', 'Deseja realmente sair do aplicativo?', 'Sair', irParaInicio);
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


  if (tela === 'perfil') {
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

          <View style={styles.menu}>

            <TouchableOpacity
              style={[styles.opcao, { backgroundColor: tema.card }]}
              onPress={() => setTela('minhasRoupas')}
            >
              <Text style={styles.textoConfig}>Minhas roupas</Text>
              <Text style={styles.iconeConfig}>☰</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.opcao, { backgroundColor: tema.card }]}
              onPress={() => {
                setNovoNome(nome);
                setNovoEmail(email);
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
              <Text style={[styles.textoSair, { color: tema.texto }]}>Sair</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.opcao, styles.opcaoPerigo, { backgroundColor: tema.card }]}
              onPress={() => setTela('excluir')}
            >
              <Text style={styles.textoPerigo}>Excluir conta</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </View>
    );
  }



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
            style={[styles.card, styles.linhaRoupa, { backgroundColor: tema.card }]}
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

  if (tela === 'editar') {
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

          <Text style={[styles.label, { color: tema.texto }]}>Nome completo</Text>

          <TextInput
            style={[
              styles.input,
              { color: tema.texto, borderColor: tema.borda, backgroundColor: tema.fundo },
            ]}
            value={novoNome}
            onChangeText={setNovoNome}
            placeholder="Digite seu nome"
            placeholderTextColor="#999"
          />

          <Text style={[styles.label, { color: tema.texto }]}>Email</Text>

          <TextInput
            style={[
              styles.input,
              { color: tema.texto, borderColor: tema.borda, backgroundColor: tema.fundo },
            ]}
            value={novoEmail}
            onChangeText={setNovoEmail}
            placeholder="Digite seu email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
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


  if (tela === 'configuracoes') {
    return (
      <View style={[styles.conteudo, { backgroundColor: tema.fundo }]}>
        <Text style={styles.titulo}>Configurações</Text>

        <View style={[styles.card, { backgroundColor: tema.card }]}>
          <View style={styles.linha}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: tema.texto }]}>Modo escuro</Text>
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



  if (tela === 'ajuda') {
    return (
      <ScrollView
        style={{ backgroundColor: tema.fundo }}
        contentContainerStyle={styles.conteudo}
      >
        <Text style={styles.titulo}>Ajuda</Text>

        <View style={[styles.card, { backgroundColor: tema.card }]}>
          <Text style={[styles.label, { color: tema.texto }]}>Precisa de ajuda?</Text>

          <Text style={[styles.descricao, { color: tema.secundario }]}>
            Estamos aqui para ajudar você a utilizar o Rewear-it!
          </Text>

          <Text style={[styles.label, { color: tema.texto }]}>Dúvidas frequentes</Text>

          <Text style={[styles.descricao, { color: tema.secundario }]}>
            • Como realizar uma troca?
            {'\n\n'}
            • Como publicar uma roupa para venda?
            {'\n\n'}
            • Como fazer uma doação?
            {'\n\n'}
            • Como editar meus dados?
          </Text>

          <Text style={[styles.label, { color: tema.texto }]}>Contato do suporte</Text>

          <Text style={{ color: '#2E7D32' }}>suporte@rewearit.com</Text>
        </View>

        <TouchableOpacity style={styles.botaoVoltar} onPress={voltar}>
          <Text style={{ color: tema.texto }}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }



  if (tela === 'excluir') {
    return (
      <ScrollView
        style={{ backgroundColor: tema.fundo }}
        contentContainerStyle={styles.conteudo}
      >
        <Text style={[styles.titulo, { color: '#C62828' }]}>Excluir conta</Text>

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
              { color: tema.texto, borderColor: tema.borda, backgroundColor: tema.fundo },
            ]}
            value={senhaExcluir}
            onChangeText={setSenhaExcluir}
            placeholder="Sua senha"
            placeholderTextColor="#999"
            secureTextEntry
          />

          <TouchableOpacity style={styles.botaoExcluir} onPress={excluirConta}>
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

  botao: {
    backgroundColor: '#7B4CC2',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
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