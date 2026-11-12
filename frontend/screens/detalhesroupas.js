import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

// endereço do servidor (o mesmo das outras telas)
const BASE = 'http://localhost:3000';

const TIPOS = { troca: 'Troca', venda: 'Venda', doacao: 'Doação' };
const COR_TIPO = { troca: '#87D8B3', venda: '#C9B5F5', doacao: '#57B87C' };
const CONDICOES = { novo: 'Novo', 'pouco usado': 'Pouco usado', usado: 'Usado' };
const TEXTO_BOTAO = {
  troca: 'Propor troca no chat',
  venda: 'Tenho interesse, conversar',
  doacao: 'Quero esta peça, conversar',
};

function aviso(titulo, mensagem) {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
}

function Info({ rotulo, valor }) {
  if (!valor) return null;

  return (
    <View style={styles.infoLinha}>
      <Text style={styles.infoRotulo}>{rotulo}</Text>
      <Text style={styles.infoValor}>{valor}</Text>
    </View>
  );
}

export default function DetalhesRoupa({ navigation, route }) {
  const usuario = route.params?.usuario;
  const idRoupa = route.params?.id_roupa;
  const demo = route.params?.demo; // peças de exemplo (fixas da Home)

  const { width } = useWindowDimensions();

  const [roupa, setRoupa] = useState(null);
  const [carregando, setCarregando] = useState(!demo);
  const [indice, setIndice] = useState(0);
  const [abrindo, setAbrindo] = useState(false);
  const [noCarrinho, setNoCarrinho] = useState(false);
  const [adicionando, setAdicionando] = useState(false);

  useEffect(() => {
    if (demo || !idRoupa) return;

    async function carregar() {
      try {
        const resposta = await fetch(`${BASE}/roupas/${idRoupa}`);
        const dados = await resposta.json();

        if (resposta.ok) {
          setRoupa(dados);

          if (dados.tipo_oferta === 'venda' && usuario?.id_usuario) {
            try {
              const rc = await fetch(`${BASE}/usuarios/${usuario.id_usuario}/carrinho`);
              const itens = await rc.json();

              if (Array.isArray(itens)) {
                setNoCarrinho(itens.some((i) => i.id_roupa === dados.id_roupa));
              }
            } catch (e) {
              console.log(e);
            }
          }
        } else {
          aviso('Erro', dados.mensagem || 'Peça não encontrada.');
        }
      } catch (erro) {
        console.log(erro);
        aviso('Erro', 'Não foi possível conectar ao servidor.');
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, [idRoupa]);

  async function conversar() {
    if (!usuario?.id_usuario) {
      aviso('Atenção', 'Faça login para conversar.');
      return;
    }

    setAbrindo(true);

    try {
      const resposta = await fetch(`${BASE}/conversas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_roupa: roupa.id_roupa,
          id_usuario: usuario.id_usuario,
        }),
      });

      const dados = await resposta.json();

      if (resposta.ok && dados.id_conversa) {
        navigation.navigate('Chat', { usuario, id_conversa: dados.id_conversa });
      } else {
        aviso('Erro', dados.mensagem || 'Não foi possível abrir a conversa.');
      }
    } catch (erro) {
      console.log(erro);
      aviso('Erro', 'Não foi possível conectar ao servidor.');
    } finally {
      setAbrindo(false);
    }
  }

  async function adicionarAoCarrinho() {
    if (!usuario?.id_usuario) {
      aviso('Atenção', 'Faça login para usar o carrinho.');
      return;
    }

    setAdicionando(true);

    try {
      const resposta = await fetch(`${BASE}/carrinho`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario: usuario.id_usuario,
          id_roupa: roupa.id_roupa,
        }),
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        setNoCarrinho(true);
      } else {
        aviso('Erro', dados.mensagem || 'Não foi possível adicionar ao carrinho.');
      }
    } catch (erro) {
      console.log(erro);
      aviso('Erro', 'Não foi possível conectar ao servidor.');
    } finally {
      setAdicionando(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#6C4AB6" />
      </View>
    );
  }

  if (!demo && !roupa) {
    return (
      <View style={styles.centro}>
        <Text style={{ color: '#777' }}>Peça não encontrada.</Text>
      </View>
    );
  }

  // dados normalizados (banco ou peça de exemplo)
  const tipo = demo
    ? { Venda: 'venda', Troca: 'troca', 'Doação': 'doacao' }[demo.tipo]
    : roupa.tipo_oferta;

  const titulo = demo ? demo.nome : roupa.titulo;

  const precoTexto = demo
    ? demo.preco
    : roupa.tipo_oferta === 'venda' && roupa.preco != null
    ? 'R$ ' + Number(roupa.preco).toFixed(2).replace('.', ',')
    : '';

  const imagens = demo
    ? [demo.imagem]
    : (roupa.fotos || []).map((f) => ({ uri: `${BASE}/uploads/${f}` }));

  const ehMinha = !demo && usuario?.id_usuario === roupa.id_usuario;
  const disponivel = demo ? true : roupa.status === 'disponivel';

  let textoBotao = TEXTO_BOTAO[tipo];
  let botaoDesativado = false;

  if (demo) {
    textoBotao = 'Peça de exemplo';
    botaoDesativado = true;
  } else if (ehMinha) {
    textoBotao = 'Esta peça é sua';
    botaoDesativado = true;
  } else if (!disponivel) {
    textoBotao = 'Peça indisponível';
    botaoDesativado = true;
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* GALERIA */}
        {imagens.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) =>
                setIndice(Math.round(e.nativeEvent.contentOffset.x / width))
              }
            >
              {imagens.map((img, i) => (
                <Image
                  key={i}
                  source={img}
                  style={{ width, height: 380 }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>

            {imagens.length > 1 && (
              <View style={styles.pontos}>
                {imagens.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.ponto, i === indice && styles.pontoAtivo]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.semFoto, { width }]}>
            <Ionicons name="shirt-outline" size={70} color="#BBB" />
          </View>
        )}

        <View style={styles.corpo}>

          <View style={[styles.badge, { backgroundColor: COR_TIPO[tipo] }]}>
            <Text style={styles.badgeTexto}>{TIPOS[tipo]}</Text>
          </View>

          <Text style={styles.titulo}>{titulo}</Text>

          {precoTexto !== '' && <Text style={styles.preco}>{precoTexto}</Text>}

          {!demo && !disponivel && (
            <Text style={styles.indisponivel}>
              Esta peça já foi concluída e não está mais disponível.
            </Text>
          )}

          {!demo && roupa.descricao ? (
            <>
              <Text style={styles.secao}>Descrição</Text>
              <Text style={styles.descricao}>{roupa.descricao}</Text>
            </>
          ) : null}

          {!demo && (
            <>
              <Text style={styles.secao}>Detalhes</Text>

              <View style={styles.cardInfo}>
                <Info rotulo="Categoria" valor={roupa.categoria} />
                <Info rotulo="Tamanho" valor={roupa.tamanho} />
                <Info rotulo="Cor" valor={roupa.cor} />
                <Info rotulo="Material" valor={roupa.material} />
                <Info rotulo="Condição" valor={CONDICOES[roupa.condicao]} />
              </View>

              <Text style={styles.secao}>Anunciado por</Text>

              <View style={styles.dono}>
                <View style={styles.avatar}>
                  {roupa.foto_usuario ? (
                    <Image
                      source={{ uri: `${BASE}/uploads/${roupa.foto_usuario}` }}
                      style={styles.avatarImg}
                    />
                  ) : (
                    <Text style={styles.avatarTexto}>
                      {roupa.nome_usuario ? roupa.nome_usuario[0].toUpperCase() : 'U'}
                    </Text>
                  )}
                </View>

                <Text style={styles.donoNome}>{roupa.nome_usuario}</Text>
              </View>
            </>
          )}

          {demo && (
            <Text style={styles.descricao}>
              Esta é uma peça de exemplo do aplicativo. Publique a sua pelo botão
              + para que outras pessoas possam conversar com você.
            </Text>
          )}

        </View>
      </ScrollView>

      {/* BOTÕES FIXOS */}
      <View style={styles.rodape}>
        {tipo === 'venda' && !botaoDesativado ? (
          <>
            {noCarrinho ? (
              <TouchableOpacity
                style={[styles.botao, styles.botaoVerde]}
                onPress={() => navigation.navigate('Carrinho', { usuario })}
              >
                <Ionicons
                  name="cart"
                  size={20}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.botaoTexto}>Na sacola · Ir para o carrinho</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.botao}
                onPress={adicionarAoCarrinho}
                disabled={adicionando}
              >
                {adicionando ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons
                      name="cart-outline"
                      size={20}
                      color="#FFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.botaoTexto}>Adicionar ao carrinho</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.botao, styles.botaoSecundario]}
              onPress={conversar}
              disabled={abrindo}
            >
              {abrindo ? (
                <ActivityIndicator color="#6C4AB6" />
              ) : (
                <>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={20}
                    color="#6C4AB6"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.botaoSecundarioTexto}>
                    Conversar com o vendedor
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.botao, botaoDesativado && styles.botaoDesativado]}
            onPress={conversar}
            disabled={botaoDesativado || abrindo}
          >
            {abrindo ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                {!botaoDesativado && (
                  <Ionicons
                    name="chatbubbles-outline"
                    size={20}
                    color="#FFF"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={styles.botaoTexto}>{textoBotao}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },

  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },

  semFoto: {
    height: 380,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  pontos: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },

  ponto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,.5)',
    marginHorizontal: 3,
  },

  pontoAtivo: {
    backgroundColor: '#FFF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  corpo: {
    padding: 20,
    paddingBottom: 30,
  },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 10,
  },

  badgeTexto: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },

  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },

  preco: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6C4AB6',
    marginTop: 6,
  },

  indisponivel: {
    color: '#C62828',
    marginTop: 10,
  },

  secao: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6C4AB6',
    marginTop: 22,
    marginBottom: 8,
  },

  descricao: {
    fontSize: 15,
    color: '#555',
    lineHeight: 23,
  },

  cardInfo: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    elevation: 2,
  },

  infoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  infoRotulo: {
    color: '#888',
    fontSize: 14,
  },

  infoValor: {
    color: '#222',
    fontSize: 14,
    fontWeight: '600',
  },

  dono: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    elevation: 2,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E9DFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },

  avatarImg: {
    width: '100%',
    height: '100%',
  },

  avatarTexto: {
    color: '#50358C',
    fontWeight: 'bold',
    fontSize: 18,
  },

  donoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },

  rodape: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },

  botao: {
    flexDirection: 'row',
    backgroundColor: '#6C4AB6',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },

  botaoVerde: {
    backgroundColor: '#57B87C',
  },

  botaoSecundario: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#6C4AB6',
    marginTop: 10,
  },

  botaoSecundarioTexto: {
    color: '#6C4AB6',
    fontWeight: 'bold',
    fontSize: 16,
  },

  botaoDesativado: {
    backgroundColor: '#BDBDBD',
  },

  botaoTexto: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },

});