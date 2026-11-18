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
  Share,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

// endereço do servidor (o mesmo das outras telas)
const BASE = 'http://localhost:3000';

const DIFICULDADES = {
  facil: { label: 'Fácil', cor: '#57B87C' },
  medio: { label: 'Médio', cor: '#9274D5' },
  dificil: { label: 'Difícil', cor: '#50358C' },
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

function formatarTempo(min) {
  if (!min) return '';
  if (min < 60) return `${min} min`;

  const h = Math.floor(min / 60);
  const m = min % 60;

  return m ? `${h}h ${m}min` : `${h}h`;
}

// transforma o texto (um item por linha) em lista
function linhas(texto) {
  return (texto || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export default function DetalhesDica({ navigation, route }) {
  const usuario = route.params?.usuario;
  const idDica = route.params?.id_dica;

  const { width } = useWindowDimensions();

  const [dica, setDica] = useState(null);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    try {
      const resposta = await fetch(
        `${BASE}/dicas/${idDica}?id_usuario=${usuario?.id_usuario || 0}`
      );
      const dados = await resposta.json();

      if (resposta.ok) {
        setDica(dados);
      } else {
        aviso('Erro', dados.mensagem || 'Dica não encontrada.');
      }
    } catch (erro) {
      console.log(erro);
      aviso('Erro', 'Não foi possível conectar ao servidor.');
    } finally {
      setCarregando(false);
    }
  }

  // recarrega ao voltar da edição
  useEffect(() => {
    carregar();

    const unsubscribe = navigation.addListener('focus', carregar);
    return unsubscribe;
  }, [navigation]);

  async function alternarFavorita() {
    if (!usuario?.id_usuario) {
      aviso('Atenção', 'Faça login para salvar tutoriais.');
      return;
    }

    setDica((d) => ({ ...d, favorita: !d.favorita }));

    try {
      const resposta = await fetch(`${BASE}/dicas/${idDica}/favoritar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario: usuario.id_usuario }),
      });

      if (!resposta.ok) throw new Error('Falha ao favoritar');
    } catch (erro) {
      console.log(erro);
      carregar();
    }
  }

  function montarTexto() {
    const dif = DIFICULDADES[dica.dificuldade]?.label;
    const tempo = formatarTempo(dica.tempo_minutos);

    let texto = `${dica.titulo}\n`;
    texto += `Dificuldade: ${dif}${tempo ? ` · Tempo: ${tempo}` : ''}\n`;

    if (dica.descricao) texto += `\n${dica.descricao}\n`;

    const materiais = linhas(dica.materiais);
    if (materiais.length) {
      texto += `\nMateriais:\n${materiais.map((m) => `• ${m}`).join('\n')}\n`;
    }

    texto += `\nPasso a passo:\n${dica.passos
      .map((p) => `${p.ordem}. ${p.descricao}`)
      .join('\n')}\n`;

    texto += '\nTutorial do Rewear-it 💜';

    return texto;
  }

  async function compartilhar() {
    const texto = montarTexto();

    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: dica.titulo, text: texto });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(texto);
          aviso('Copiado', 'O tutorial foi copiado. Cole onde quiser compartilhar!');
        } else {
          aviso('Compartilhar', 'Seu navegador não permite compartilhar.');
        }
      } else {
        await Share.share({ title: dica.titulo, message: texto });
      }
    } catch (erro) {
      console.log(erro); // normalmente é só a pessoa cancelando
    }
  }

  function excluir() {
    confirmar(
      'Excluir dica',
      'Deseja excluir este tutorial? Essa ação não pode ser desfeita.',
      'Excluir',
      async () => {
        try {
          const resposta = await fetch(`${BASE}/dicas/${idDica}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: usuario.id_usuario }),
          });

          const dados = await resposta.json();

          if (resposta.ok && dados.sucesso) {
            navigation.goBack();
          } else {
            aviso('Erro', dados.mensagem || 'Não foi possível excluir.');
          }
        } catch (erro) {
          console.log(erro);
          aviso('Erro', 'Não foi possível conectar ao servidor.');
        }
      }
    );
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#6C4AB6" />
      </View>
    );
  }

  if (!dica) {
    return (
      <View style={styles.centro}>
        <Text style={{ color: '#777' }}>Dica não encontrada.</Text>
      </View>
    );
  }

  const dif = DIFICULDADES[dica.dificuldade];
  const ehAutor = usuario?.id_usuario === dica.id_usuario;
  const materiais = linhas(dica.materiais);
  const ferramentas = linhas(dica.ferramentas);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* IMAGEM */}
      {dica.foto ? (
        <Image
          source={{ uri: `${BASE}/uploads/${dica.foto}` }}
          style={{ width, height: 280 }}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.semFoto, { width }]}>
          <Ionicons name="leaf-outline" size={70} color="#87D8B3" />
        </View>
      )}

      <View style={styles.corpo}>

        {/* SELOS */}
        <View style={styles.selos}>
          <View style={[styles.selo, { backgroundColor: dif.cor }]}>
            <Text style={styles.seloTexto}>{dif.label}</Text>
          </View>

          {dica.tempo_minutos ? (
            <View style={styles.seloClaro}>
              <Ionicons name="time-outline" size={14} color="#6C4AB6" />
              <Text style={styles.seloClaroTexto}>
                {formatarTempo(dica.tempo_minutos)}
              </Text>
            </View>
          ) : null}

          <View style={styles.seloClaro}>
            <Text style={styles.seloClaroTexto}>{dica.categoria}</Text>
          </View>
        </View>

        <Text style={styles.titulo}>{dica.titulo}</Text>

        <Text style={styles.autor}>Por {dica.autor}</Text>

        {/* AÇÕES */}
        <View style={styles.acoes}>
          <TouchableOpacity style={styles.botaoAcao} onPress={alternarFavorita}>
            <Ionicons
              name={dica.favorita ? 'heart' : 'heart-outline'}
              size={20}
              color={dica.favorita ? '#FF6B8A' : '#6C4AB6'}
            />
            <Text style={styles.botaoAcaoTexto}>
              {dica.favorita ? 'Salvo' : 'Salvar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botaoAcao} onPress={compartilhar}>
            <Ionicons name="share-social-outline" size={20} color="#6C4AB6" />
            <Text style={styles.botaoAcaoTexto}>Compartilhar</Text>
          </TouchableOpacity>
        </View>

        {dica.descricao ? (
          <>
            <Text style={styles.secao}>Sobre o projeto</Text>
            <Text style={styles.texto}>{dica.descricao}</Text>
          </>
        ) : null}

        {materiais.length > 0 && (
          <>
            <Text style={styles.secao}>Materiais</Text>
            <View style={styles.card}>
              {materiais.map((m, i) => (
                <View key={i} style={styles.itemLista}>
                  <Ionicons name="checkmark-circle" size={18} color="#13B76B" />
                  <Text style={styles.itemListaTexto}>{m}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {ferramentas.length > 0 && (
          <>
            <Text style={styles.secao}>Ferramentas</Text>
            <View style={styles.card}>
              {ferramentas.map((f, i) => (
                <View key={i} style={styles.itemLista}>
                  <Ionicons name="construct-outline" size={18} color="#9274D5" />
                  <Text style={styles.itemListaTexto}>{f}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.secao}>Passo a passo</Text>

        {dica.passos.map((p) => (
          <View key={p.ordem} style={styles.passo}>
            <View style={styles.passoNumero}>
              <Text style={styles.passoNumeroTexto}>{p.ordem}</Text>
            </View>

            <Text style={styles.passoTexto}>{p.descricao}</Text>
          </View>
        ))}

        {/* SÓ O AUTOR */}
        {ehAutor && (
          <View style={styles.areaAutor}>
            <TouchableOpacity
              style={styles.botaoEditar}
              onPress={() =>
                navigation.navigate('NovaDica', { usuario, id_dica: dica.id_dica })
              }
            >
              <Ionicons name="create-outline" size={18} color="#FFF" />
              <Text style={styles.botaoEditarTexto}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botaoExcluir} onPress={excluir}>
              <Ionicons name="trash-outline" size={18} color="#C62828" />
              <Text style={styles.botaoExcluirTexto}>Excluir</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </ScrollView>
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
    height: 280,
    backgroundColor: '#EAFBF3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  corpo: {
    padding: 20,
    paddingBottom: 40,
  },

  selos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },

  selo: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 6,
  },

  seloTexto: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },

  seloClaro: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 6,
  },

  seloClaroTexto: {
    color: '#6C4AB6',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },

  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
  },

  autor: {
    color: '#888',
    marginTop: 4,
  },

  acoes: {
    flexDirection: 'row',
    marginTop: 14,
  },

  botaoAcao: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C9B5F5',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
  },

  botaoAcaoTexto: {
    color: '#6C4AB6',
    fontWeight: '600',
    marginLeft: 6,
  },

  secao: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C4AB6',
    marginTop: 24,
    marginBottom: 10,
  },

  texto: {
    fontSize: 15,
    color: '#555',
    lineHeight: 23,
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    elevation: 2,
  },

  itemLista: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },

  itemListaTexto: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginLeft: 10,
  },

  passo: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },

  passoNumero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6C4AB6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  passoNumeroTexto: {
    color: '#FFF',
    fontWeight: 'bold',
  },

  passoTexto: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },

  areaAutor: {
    flexDirection: 'row',
    marginTop: 26,
  },

  botaoEditar: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6C4AB6',
    height: 48,
    borderRadius: 24,
    marginRight: 10,
  },

  botaoEditarTexto: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 6,
  },

  botaoExcluir: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3C4C4',
    backgroundColor: '#FFF',
    height: 48,
    borderRadius: 24,
  },

  botaoExcluirTexto: {
    color: '#C62828',
    fontWeight: 'bold',
    marginLeft: 6,
  },

});