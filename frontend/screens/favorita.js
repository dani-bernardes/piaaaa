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

function formatarPreco(valor) {
  return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

export default function Favoritos({ navigation, route }) {
  const usuario = route.params?.usuario;

  const [itens, setItens] = useState([]);

  async function carregar() {
    if (!usuario?.id_usuario) return;

    try {
      const resposta = await fetch(`${BASE}/usuarios/${usuario.id_usuario}/favoritos`);
      const dados = await resposta.json();

      if (Array.isArray(dados)) setItens(dados);
    } catch (erro) {
      console.log('Erro ao carregar favoritos:', erro);
    }
  }

  // carrega ao abrir e sempre que voltar para esta tela
  useEffect(() => {
    carregar();

    const unsubscribe = navigation.addListener('focus', carregar);
    return unsubscribe;
  }, [navigation]);

  async function remover(item) {
    // tira da tela na hora
    setItens((anterior) => anterior.filter((i) => i.id_roupa !== item.id_roupa));

    try {
      await fetch(`${BASE}/favoritos/alternar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario: usuario.id_usuario,
          id_roupa: item.id_roupa,
        }),
      });
    } catch (erro) {
      console.log(erro);
      carregar(); // se falhou, volta o estado real
    }
  }

  function renderItem({ item }) {
    const indisponivel = item.status !== 'disponivel';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('DetalhesRoupa', { usuario, id_roupa: item.id_roupa })
        }
      >
        {item.foto ? (
          <Image
            source={{ uri: `${BASE}/uploads/${item.foto}` }}
            style={[styles.imagem, indisponivel && { opacity: 0.4 }]}
          />
        ) : (
          <View style={[styles.imagem, styles.semFoto]}>
            <Ionicons name="shirt-outline" size={40} color="#BBB" />
          </View>
        )}

        <TouchableOpacity style={styles.coracao} onPress={() => remover(item)}>
          <Ionicons name="heart" size={22} color="#FF6B8A" />
        </TouchableOpacity>

        <View style={styles.info}>
          <Text style={styles.tipo}>{TIPOS[item.tipo_oferta]}</Text>
          <Text style={styles.nome} numberOfLines={2}>
            {item.titulo}
          </Text>

          {indisponivel ? (
            <Text style={styles.indisponivel}>Indisponível</Text>
          ) : (
            item.tipo_oferta === 'venda' &&
            item.preco != null && (
              <Text style={styles.preco}>{formatarPreco(item.preco)}</Text>
            )
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={itens}
        keyExtractor={(item) => item.id_roupa.toString()}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={{ paddingVertical: 16, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.vazio}>
            <Ionicons name="heart-outline" size={64} color="#C9B5F5" />
            <Text style={styles.vazioTexto}>
              Você ainda não favoritou nenhuma peça.{'\n'}
              Toque no coração de uma peça na Home para salvá-la aqui.
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

  card: {
    backgroundColor: '#FFF',
    width: '46%',
    marginHorizontal: '2%',
    marginBottom: 18,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
  },

  imagem: {
    width: '100%',
    height: 180,
  },

  semFoto: {
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  coracao: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  info: {
    padding: 12,
  },

  tipo: {
    fontSize: 13,
    color: '#777',
  },

  nome: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },

  preco: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C4AB6',
    marginTop: 6,
  },

  indisponivel: {
    color: '#C62828',
    fontWeight: '600',
    marginTop: 6,
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