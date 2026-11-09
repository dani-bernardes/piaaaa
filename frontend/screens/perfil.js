
import React, { useState } from 'react';

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
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

export default function Perfil({ navigation }) {

  const [tela, setTela] = useState('perfil');

  const [nome, setNome] = useState('Maria Silva');
  const [email, setEmail] = useState('maria.silva@gmail.com');

  const [novoNome, setNovoNome] = useState('Maria Silva');
  const [novoEmail, setNovoEmail] = useState('maria.silva@gmail.com');

  const [foto, setFoto] = useState(null);

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


  const escolherFoto = async () => {

    try {
      const permissao =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissao.granted) {
        Alert.alert(
          'Permissão necessária',
          'Precisamos acessar sua galeria para escolher uma foto.'
        );
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!resultado.canceled) {
        setFoto(resultado.assets[0].uri);
      }

    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar a foto.');
    }
  };


  const salvarPerfil = () => {

    if (!novoNome.trim() || !novoEmail.trim()) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    setNome(novoNome.trim());
    setEmail(novoEmail.trim());

    Alert.alert(
      'Sucesso!',
      'Seu perfil foi atualizado com sucesso!'
    );

    setTela('perfil');
  };

  // sair da conta 

  const sair = () => {

    Alert.alert(
      'Sair da conta',
      'Deseja realmente sair do aplicativo?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',

          onPress: () => {
            navigation.replace('TelaInicial');
          },
        },
      ]
    );
  };

  // voltar para o perfil 

  const voltar = () => {
    setTela('perfil');
  };

  // foto

  const Avatar = ({ tamanho = 90 }) => (
    <View
      style={[
        styles.avatar,
        {
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
        },
      ]}
    >
      {foto ? (
        <Image
          source={{ uri: foto }}
          style={styles.imagemPerfil}
        />
      ) : (
        <Text style={styles.avatarTexto}>
          {nome ? nome[0].toUpperCase() : 'U'}
        </Text>
      )}
    </View>
  );


  if (tela === 'perfil') {

    return (
      <View
        style={[
          styles.container,
          { backgroundColor: tema.fundo },
        ]}
      >

        <ScrollView showsVerticalScrollIndicator={false}>

          {/* CABEÇALHO */}

          <View style={styles.topo}>

            <Text style={styles.topoTitulo}>
              Seu perfil
            </Text>

            <Avatar tamanho={65} />

            <Text style={styles.nome}>
              {nome}
            </Text>

            <Text style={styles.email}>
              {email}
            </Text>

          </View>

          {/* ESTATÍSTICAS */}

          <View style={styles.statsContainer}>

            <View style={styles.statsRoxo}>
              <Text style={styles.numero}>12</Text>
              <Text style={styles.statsTexto}>Trocas</Text>
            </View>

            <View style={styles.statsVerde}>
              <Text style={styles.numero}>5</Text>
              <Text style={styles.statsTexto}>Vendas</Text>
            </View>

            <View style={styles.statsRoxo}>
              <Text style={styles.numero}>8</Text>
              <Text style={styles.statsTexto}>Doações</Text>
            </View>

          </View>

          {/* MENU DO PERFIL */}

          <View style={styles.menu}>

            {/* EDITAR PERFIL */}

            <TouchableOpacity
              style={[
                styles.opcao,
                { backgroundColor: tema.card },
              ]}
              onPress={() => {
                setNovoNome(nome);
                setNovoEmail(email);
                setTela('editar');
              }}
            >

              <Text style={styles.textoEditar}>
                Editar perfil
              </Text>

              <Text style={styles.iconeEditar}>
                ♙
              </Text>

            </TouchableOpacity>

            {/* CONFIGURAÇÕES */}

            <TouchableOpacity
              style={[
                styles.opcao,
                { backgroundColor: tema.card },
              ]}
              onPress={() => setTela('configuracoes')}
            >

              <Text style={styles.textoConfig}>
                Configurações
              </Text>

              <Text style={styles.iconeConfig}>
                ⚙
              </Text>

            </TouchableOpacity>

            {/* AJUDA */}

            <TouchableOpacity
              style={[
                styles.opcao,
                { backgroundColor: tema.card },
              ]}
              onPress={() => setTela('ajuda')}
            >

              <Text style={styles.textoAjuda}>
                Ajuda
              </Text>

              <Text style={styles.iconeAjuda}>
                ⓘ
              </Text>

            </TouchableOpacity>

            {/* SAIR */}

            <TouchableOpacity
              style={[
                styles.opcao,
                { backgroundColor: tema.card },
              ]}
              onPress={sair}
            >

              <Text
                style={[
                  styles.textoSair,
                  { color: tema.texto },
                ]}
              >
                Sair
              </Text>

            </TouchableOpacity>

          </View>

        </ScrollView>

      </View>
    );
  }


  if (tela === 'editar') {

    return (

      <ScrollView
        style={{ backgroundColor: tema.fundo }}
        contentContainerStyle={styles.conteudo}
      >

        <Text style={styles.titulo}>
          Editar perfil
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: tema.card },
          ]}
        >

          {/* FOTO DE PERFIL */}

          <TouchableOpacity
            style={styles.areaFoto}
            onPress={escolherFoto}
          >

            <Avatar tamanho={100} />

            <Text style={styles.textoFoto}>
              Alterar foto de perfil
            </Text>

            <Text style={styles.textoFotoSecundario}>
              Escolha uma imagem da galeria
            </Text>

          </TouchableOpacity>

          {/* NOME */}

          <Text style={[styles.label, { color: tema.texto }]}>
            Nome completo
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
            value={novoNome}
            onChangeText={setNovoNome}
            placeholder="Digite seu nome"
            placeholderTextColor="#999"
          />

          {/* EMAIL */}

          <Text style={[styles.label, { color: tema.texto }]}>
            Email
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
            value={novoEmail}
            onChangeText={setNovoEmail}
            placeholder="Digite seu email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* SALVAR */}

          <TouchableOpacity
            style={styles.botao}
            onPress={salvarPerfil}
          >

            <Text style={styles.botaoTexto}>
              Salvar alterações
            </Text>

          </TouchableOpacity>

        </View>

        <TouchableOpacity
          style={styles.botaoVoltar}
          onPress={voltar}
        >

          <Text style={{ color: tema.texto }}>
            Voltar
          </Text>

        </TouchableOpacity>

      </ScrollView>
    );
  }



  if (tela === 'configuracoes') {

    return (

      <View
        style={[
          styles.conteudo,
          { backgroundColor: tema.fundo },
        ]}
      >

        <Text style={styles.titulo}>
          Configurações
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: tema.card },
          ]}
        >

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
              trackColor={{
                false: '#CCC',
                true: '#7B4CC2',
              }}
              thumbColor="#FFF"
            />

          </View>

        </View>

        <TouchableOpacity
          style={styles.botaoVoltar}
          onPress={voltar}
        >

          <Text style={{ color: tema.texto }}>
            Voltar
          </Text>

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

        <Text style={styles.titulo}>
          Ajuda
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: tema.card },
          ]}
        >

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

        <TouchableOpacity
          style={styles.botaoVoltar}
          onPress={voltar}
        >

          <Text style={{ color: tema.texto }}>
            Voltar
          </Text>

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
    marginVertical: 18,
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
