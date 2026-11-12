import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

// endereço do servidor (o mesmo das outras telas)
const BASE = 'http://localhost:3000';

function aviso(titulo, mensagem) {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
}

function formatarHora(data) {
  return new Date(data).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Chat({ navigation, route }) {
  const usuario = route.params?.usuario;
  const idConversa = route.params?.id_conversa;

  const [conversa, setConversa] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const lista = useRef(null);

  async function carregar() {
    try {
      const resposta = await fetch(
        `${BASE}/conversas/${idConversa}/mensagens?id_usuario=${usuario.id_usuario}`
      );
      const dados = await resposta.json();

      if (resposta.ok) {
        setConversa(dados.conversa);

        // só atualiza se chegou mensagem nova
        setMensagens((anterior) => {
          const ultimaNova = dados.mensagens[dados.mensagens.length - 1];
          const ultimaAntiga = anterior[anterior.length - 1];

          if (
            anterior.length === dados.mensagens.length &&
            ultimaAntiga?.id_mensagem === ultimaNova?.id_mensagem
          ) {
            return anterior;
          }

          return dados.mensagens;
        });
      }
    } catch (erro) {
      console.log('Erro ao carregar mensagens:', erro);
    }
  }

  // carrega e atualiza a cada 3 segundos
  useEffect(() => {
    carregar();

    const intervalo = setInterval(carregar, 3000);
    return () => clearInterval(intervalo);
  }, []);

  // título da tela = nome da outra pessoa
  useEffect(() => {
    if (conversa) {
      navigation.setOptions({ title: conversa.outro_nome });
    }
  }, [conversa]);

  // rola para a última mensagem quando chega mensagem nova
  useEffect(() => {
    setTimeout(() => {
      lista.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [mensagens.length]);

  async function enviar() {
    const mensagem = texto.trim();

    if (!mensagem || enviando) return;

    setEnviando(true);
    setTexto('');

    try {
      const resposta = await fetch(`${BASE}/conversas/${idConversa}/mensagens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario: usuario.id_usuario,
          texto: mensagem,
        }),
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        await carregar();
      } else {
        setTexto(mensagem);
        aviso('Erro', dados.mensagem || 'Não foi possível enviar.');
      }
    } catch (erro) {
      console.log(erro);
      setTexto(mensagem);
      aviso('Erro', 'Não foi possível conectar ao servidor.');
    } finally {
      setEnviando(false);
    }
  }

  function renderMensagem({ item }) {
    const minha = item.id_remetente === usuario.id_usuario;

    return (
      <View style={[styles.linha, minha ? styles.linhaMinha : styles.linhaOutro]}>
        <View style={[styles.balao, minha ? styles.balaoMinha : styles.balaoOutro]}>
          <Text style={minha ? styles.textoMinha : styles.textoOutro}>
            {item.texto}
          </Text>

          <Text style={[styles.hora, minha ? styles.horaMinha : styles.horaOutro]}>
            {formatarHora(item.data_envio)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >

      {/* PEÇA DA CONVERSA */}
      {conversa && (
        <TouchableOpacity
          style={styles.peca}
          onPress={() =>
            navigation.navigate('DetalhesRoupa', {
              usuario,
              id_roupa: conversa.id_roupa,
            })
          }
        >
          {conversa.foto ? (
            <Image
              source={{ uri: `${BASE}/uploads/${conversa.foto}` }}
              style={styles.pecaFoto}
            />
          ) : (
            <View style={[styles.pecaFoto, styles.pecaSemFoto]}>
              <Ionicons name="shirt-outline" size={20} color="#BBB" />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.pecaRotulo}>Sobre a peça</Text>
            <Text style={styles.pecaTitulo} numberOfLines={1}>
              {conversa.titulo}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      )}

      <FlatList
        ref={lista}
        data={mensagens}
        keyExtractor={(item) => item.id_mensagem.toString()}
        renderItem={renderMensagem}
        contentContainerStyle={styles.listaConteudo}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.vazio}>
            Diga olá 👋 e combine os detalhes da troca!
          </Text>
        }
      />

      {/* CAMPO DE MENSAGEM */}
      <View style={styles.barra}>
        <TextInput
          style={styles.input}
          placeholder="Digite uma mensagem..."
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={enviar}
          blurOnSubmit={false}
          multiline={false}
        />

        <TouchableOpacity
          style={[styles.botaoEnviar, (!texto.trim() || enviando) && { opacity: 0.5 }]}
          onPress={enviar}
          disabled={!texto.trim() || enviando}
        >
          <Ionicons name="send" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F3EEFB',
  },

  peca: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },

  pecaFoto: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 10,
  },

  pecaSemFoto: {
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  pecaRotulo: {
    fontSize: 11,
    color: '#888',
  },

  pecaTitulo: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
  },

  listaConteudo: {
    padding: 14,
    flexGrow: 1,
  },

  vazio: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
  },

  linha: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  linhaMinha: {
    justifyContent: 'flex-end',
  },

  linhaOutro: {
    justifyContent: 'flex-start',
  },

  balao: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },

  balaoMinha: {
    backgroundColor: '#6C4AB6',
    borderBottomRightRadius: 4,
  },

  balaoOutro: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    elevation: 1,
  },

  textoMinha: {
    color: '#FFF',
    fontSize: 15,
  },

  textoOutro: {
    color: '#222',
    fontSize: 15,
  },

  hora: {
    fontSize: 10,
    marginTop: 3,
    alignSelf: 'flex-end',
  },

  horaMinha: {
    color: '#E0D4F7',
  },

  horaOutro: {
    color: '#999',
  },

  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },

  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    paddingHorizontal: 16,
    marginRight: 10,
  },

  botaoEnviar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C4AB6',
    justifyContent: 'center',
    alignItems: 'center',
  },

});