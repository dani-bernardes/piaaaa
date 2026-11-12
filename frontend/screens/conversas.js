import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

// endereço do servidor (o mesmo das outras telas)
const BASE = 'http://localhost:3000';

const TIPOS = { troca: 'Troca', venda: 'Venda', doacao: 'Doação' };

function formatarData(data) {
  if (!data) return '';

  const d = new Date(data);
  const hoje = new Date();

  if (d.toDateString() === hoje.toDateString()) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function Conversas({ navigation, route }) {
  const usuario = route.params?.usuario;

  const [conversas, setConversas] = useState([]);

  async function carregar() {
    if (!usuario?.id_usuario) return;

    try {
      const resposta = await fetch(`${BASE}/usuarios/${usuario.id_usuario}/conversas`);
      const dados = await resposta.json();

      if (Array.isArray(dados)) setConversas(dados);
    } catch (erro) {
      console.log('Erro ao carregar conversas:', erro);
    }
  }

  // carrega ao abrir e sempre que voltar para esta tela
  useEffect(() => {
    carregar();

    const unsubscribe = navigation.addListener('focus', carregar);
    return unsubscribe;
  }, [navigation]);

  function renderConversa({ item }) {
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() =>
          navigation.navigate('Chat', { usuario, id_conversa: item.id_conversa })
        }
      >
        {item.foto ? (
          <Image
            source={{ uri: `${BASE}/uploads/${item.foto}` }}
            style={styles.foto}
          />
        ) : (
          <View style={[styles.foto, styles.semFoto]}>
            <Ionicons name="shirt-outline" size={26} color="#BBB" />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <View style={styles.topoItem}>
            <Text style={styles.nome} numberOfLines={1}>
              {item.outro_nome}
            </Text>
            <Text style={styles.data}>{formatarData(item.ultima_data)}</Text>
          </View>

          <Text style={styles.peca} numberOfLines={1}>
            {TIPOS[item.tipo_oferta]} · {item.titulo}
          </Text>

          <Text style={styles.ultima} numberOfLines={1}>
            {item.ultima_mensagem || 'Conversa iniciada'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversas}
        keyExtractor={(item) => item.id_conversa.toString()}
        renderItem={renderConversa}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.vazio}>
            <Ionicons name="chatbubbles-outline" size={60} color="#C9B5F5" />
            <Text style={styles.vazioTexto}>
              Você ainda não tem conversas.{'\n'}
              Toque em uma peça e escolha "Conversar" para começar.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
  },

  foto: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },

  semFoto: {
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  topoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  nome: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginRight: 8,
  },

  data: {
    fontSize: 12,
    color: '#999',
  },

  peca: {
    fontSize: 12,
    color: '#6C4AB6',
    marginTop: 2,
  },

  ultima: {
    fontSize: 14,
    color: '#777',
    marginTop: 3,
  },

  vazio: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: 80,
  },

  vazioTexto: {
    textAlign: 'center',
    color: '#888',
    marginTop: 14,
    lineHeight: 22,
  },

});