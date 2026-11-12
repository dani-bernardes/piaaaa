import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
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

function confirmar(titulo, mensagem, textoOk, aoConfirmar) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensagem}`)) aoConfirmar();
  } else {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel' },
      { text: textoOk, onPress: aoConfirmar },
    ]);
  }
}

function formatarPreco(valor) {
  return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

export default function Carrinho({ navigation, route }) {
  const usuario = route.params?.usuario;

  const [itens, setItens] = useState([]);
  const [finalizando, setFinalizando] = useState(false);

  async function carregar() {
    if (!usuario?.id_usuario) return;

    try {
      const resposta = await fetch(`${BASE}/usuarios/${usuario.id_usuario}/carrinho`);
      const dados = await resposta.json();

      if (Array.isArray(dados)) setItens(dados);
    } catch (erro) {
      console.log('Erro ao carregar carrinho:', erro);
    }
  }

  // carrega ao abrir e sempre que voltar para esta tela
  useEffect(() => {
    carregar();

    const unsubscribe = navigation.addListener('focus', carregar);
    return unsubscribe;
  }, [navigation]);

  async function remover(item) {
    try {
      await fetch(`${BASE}/carrinho/${usuario.id_usuario}/${item.id_roupa}`, {
        method: 'DELETE',
      });

      carregar();
    } catch (erro) {
      console.log(erro);
      aviso('Erro', 'Não foi possível remover a peça.');
    }
  }

  const disponiveis = itens.filter((i) => i.status === 'disponivel');
  const total = disponiveis.reduce((soma, i) => soma + Number(i.preco || 0), 0);

  function finalizar() {
    if (disponiveis.length === 0) {
      aviso('Atenção', 'Não há peças disponíveis no carrinho.');
      return;
    }

    confirmar(
      'Finalizar pedido',
      `Reservar ${disponiveis.length} peça(s) por ${formatarPreco(total)}? Os vendedores serão avisados no chat para combinar pagamento e entrega.`,
      'Finalizar',
      async () => {
        setFinalizando(true);

        try {
          const resposta = await fetch(`${BASE}/carrinho/finalizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: usuario.id_usuario }),
          });

          const dados = await resposta.json();

          if (resposta.ok && dados.sucesso) {
            let mensagem = `${dados.reservadas} peça(s) reservada(s)! Combine o pagamento e a entrega com o vendedor em Conversas.`;

            if (dados.indisponiveis > 0) {
              mensagem += `\n${dados.indisponiveis} peça(s) ficou/ficaram indisponível(is).`;
            }

            aviso('Pedido feito', mensagem);
            carregar();
          } else {
            aviso('Erro', dados.mensagem || 'Não foi possível finalizar.');
          }
        } catch (erro) {
          console.log(erro);
          aviso('Erro', 'Não foi possível conectar ao servidor.');
        } finally {
          setFinalizando(false);
        }
      }
    );
  }

  function renderItem({ item }) {
    const indisponivel = item.status !== 'disponivel';

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() =>
          navigation.navigate('DetalhesRoupa', { usuario, id_roupa: item.id_roupa })
        }
      >
        {item.foto ? (
          <Image
            source={{ uri: `${BASE}/uploads/${item.foto}` }}
            style={[styles.foto, indisponivel && { opacity: 0.4 }]}
          />
        ) : (
          <View style={[styles.foto, styles.semFoto]}>
            <Ionicons name="shirt-outline" size={28} color="#BBB" />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.titulo} numberOfLines={2}>
            {item.titulo}
          </Text>

          <Text style={styles.vendedor}>Vendedor: {item.nome_vendedor}</Text>

          {indisponivel ? (
            <Text style={styles.indisponivel}>Peça indisponível</Text>
          ) : (
            <Text style={styles.preco}>{formatarPreco(item.preco)}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.remover} onPress={() => remover(item)}>
          <Ionicons name="trash-outline" size={22} color="#C62828" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={itens}
        keyExtractor={(item) => item.id_roupa.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.vazio}>
            <Ionicons name="cart-outline" size={64} color="#C9B5F5" />
            <Text style={styles.vazioTexto}>
              Seu carrinho está vazio.{'\n'}
              Peças à venda que você adicionar aparecem aqui.
            </Text>

            <TouchableOpacity
              style={styles.botaoVoltarHome}
              onPress={() => navigation.navigate('Home', { usuario })}
            >
              <Text style={styles.botaoVoltarHomeTexto}>Ver peças</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {itens.length > 0 && (
        <View style={styles.rodape}>
          <View style={styles.totalLinha}>
            <Text style={styles.totalRotulo}>
              Total ({disponiveis.length} peça{disponiveis.length === 1 ? '' : 's'})
            </Text>
            <Text style={styles.totalValor}>{formatarPreco(total)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.botao, (finalizando || disponiveis.length === 0) && { opacity: 0.5 }]}
            onPress={finalizar}
            disabled={finalizando || disponiveis.length === 0}
          >
            {finalizando ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.botaoTexto}>Finalizar pedido</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
    width: 76,
    height: 90,
    borderRadius: 12,
    marginRight: 12,
  },

  semFoto: {
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  titulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },

  vendedor: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
  },

  preco: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C4AB6',
    marginTop: 6,
  },

  indisponivel: {
    color: '#C62828',
    marginTop: 6,
    fontWeight: '600',
  },

  remover: {
    padding: 8,
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

  botaoVoltarHome: {
    marginTop: 20,
    backgroundColor: '#6C4AB6',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },

  botaoVoltarHomeTexto: {
    color: '#FFF',
    fontWeight: 'bold',
  },

  rodape: {
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },

  totalLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  totalRotulo: {
    fontSize: 15,
    color: '#555',
  },

  totalValor: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6C4AB6',
  },

  botao: {
    backgroundColor: '#6C4AB6',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },

  botaoTexto: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },

});