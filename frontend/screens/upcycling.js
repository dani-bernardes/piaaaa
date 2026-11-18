import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

// endereço do servidor (o mesmo das outras telas)
const BASE = 'http://localhost:3000';

const CATEGORIAS = [
  'Customização de camisetas',
  'Transformação de jeans',
  'Reaproveitamento de tecidos',
  'Customização de acessórios',
  'Roupas antigas',
  'Decoração',
  'Consertos e ajustes',
];

const DIFICULDADES = {
  facil: { label: 'Fácil', cor: '#57B87C' },
  medio: { label: 'Médio', cor: '#9274D5' },
  dificil: { label: 'Difícil', cor: '#50358C' },
};

// tira acentos e deixa minúsculo (assim "calca" encontra "Calça")
function normalizar(texto) {
  return (texto || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatarTempo(min) {
  if (!min) return '';
  if (min < 60) return `${min} min`;

  const h = Math.floor(min / 60);
  const m = min % 60;

  return m ? `${h}h ${m}min` : `${h}h`;
}

function Chip({ label, ativo, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, ativo && styles.chipAtivo]}
    >
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Foto({ dica, estilo }) {
  if (dica.foto) {
    return (
      <Image
        source={{ uri: `${BASE}/uploads/${dica.foto}` }}
        style={estilo}
      />
    );
  }

  return (
    <View style={[estilo, styles.semFoto]}>
      <Ionicons name="leaf-outline" size={34} color="#87D8B3" />
    </View>
  );
}

// cartão em destaque (lista horizontal)
function CardDestaque({ dica, onPress }) {
  const dif = DIFICULDADES[dica.dificuldade];

  return (
    <TouchableOpacity style={styles.destaque} onPress={onPress}>
      <Foto dica={dica} estilo={styles.destaqueFoto} />

      <View style={[styles.selo, { backgroundColor: dif.cor }]}>
        <Text style={styles.seloTexto}>{dif.label}</Text>
      </View>

      <View style={{ padding: 12 }}>
        <Text style={styles.destaqueTitulo} numberOfLines={2}>
          {dica.titulo}
        </Text>

        <Text style={styles.meta}>
          {formatarTempo(dica.tempo_minutos) || 'Tempo livre'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// item da lista
function ItemDica({ dica, onPress, onFavoritar }) {
  const dif = DIFICULDADES[dica.dificuldade];

  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <Foto dica={dica} estilo={styles.itemFoto} />

      <View style={{ flex: 1 }}>
        <Text style={styles.meta}>
          <Text style={{ color: dif.cor, fontWeight: 'bold' }}>{dif.label}</Text>
          {dica.tempo_minutos ? `  ·  ${formatarTempo(dica.tempo_minutos)}` : ''}
        </Text>

        <Text style={styles.itemTitulo} numberOfLines={2}>
          {dica.titulo}
        </Text>

        <Text style={styles.itemCategoria} numberOfLines={1}>
          {dica.categoria}
        </Text>

        <View style={styles.botaoVer}>
          <Text style={styles.botaoVerTexto}>Ver tutorial</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.coracao} onPress={onFavoritar}>
        <Ionicons
          name={dica.favorita ? 'heart' : 'heart-outline'}
          size={22}
          color={dica.favorita ? '#FF6B8A' : '#AAA'}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function Upcycling({ navigation, route }) {
  const usuario = route.params?.usuario;

  const [dicas, setDicas] = useState([]);
  const [carregado, setCarregado] = useState(false);

  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [dificuldade, setDificuldade] = useState('');
  const [soSalvas, setSoSalvas] = useState(false);

  async function carregar() {
    try {
      const resposta = await fetch(
        `${BASE}/dicas?id_usuario=${usuario?.id_usuario || 0}`
      );
      const dados = await resposta.json();

      if (Array.isArray(dados)) setDicas(dados);
    } catch (erro) {
      console.log('Erro ao carregar dicas:', erro);
    } finally {
      setCarregado(true);
    }
  }

  // carrega ao abrir e sempre que voltar para esta tela
  useEffect(() => {
    carregar();

    const unsubscribe = navigation.addListener('focus', carregar);
    return unsubscribe;
  }, [navigation]);

  async function alternarFavorita(dica) {
    if (!usuario?.id_usuario) return;

    // atualiza na hora
    setDicas((anterior) =>
      anterior.map((d) =>
        d.id_dica === dica.id_dica
          ? {
              ...d,
              favorita: !d.favorita,
              total_favoritos: d.total_favoritos + (d.favorita ? -1 : 1),
            }
          : d
      )
    );

    try {
      const resposta = await fetch(`${BASE}/dicas/${dica.id_dica}/favoritar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario: usuario.id_usuario }),
      });

      if (!resposta.ok) throw new Error('Falha ao favoritar');
    } catch (erro) {
      console.log(erro);
      carregar(); // se falhou, volta o estado real
    }
  }

  function abrir(dica) {
    navigation.navigate('DetalhesDica', { usuario, id_dica: dica.id_dica });
  }

  // ---------- filtros ----------

  const termo = normalizar(busca.trim());

  const filtradas = dicas.filter((d) => {
    if (termo) {
      const alvo = normalizar([d.titulo, d.descricao, d.categoria].join(' '));
      if (!alvo.includes(termo)) return false;
    }

    if (categoria && d.categoria !== categoria) return false;
    if (dificuldade && d.dificuldade !== dificuldade) return false;
    if (soSalvas && !d.favorita) return false;

    return true;
  });

  const temFiltro = termo || categoria || dificuldade || soSalvas;

  // destaques: as mais favoritadas (só aparecem sem filtros)
  const destaques = [...dicas]
    .sort((a, b) => b.total_favoritos - a.total_favoritos)
    .slice(0, 4);

  function limpar() {
    setBusca('');
    setCategoria('');
    setDificuldade('');
    setSoSalvas(false);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >

        {/* APRESENTAÇÃO */}
        <View style={styles.intro}>
          <View style={styles.introIcone}>
            <Ionicons name="leaf" size={28} color="#FFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.introTitulo}>O que é Upcycling?</Text>
            <Text style={styles.introTexto}>
              É transformar peças que você não usa mais em algo novo e útil,
              prolongando a vida do tecido e reduzindo o desperdício têxtil.
            </Text>
          </View>
        </View>

        {/* PESQUISA */}
        <View style={styles.search}>
          <Ionicons
            name="search"
            size={22}
            color="#777"
            style={{ marginLeft: 12 }}
          />

          <TextInput
            style={styles.input}
            placeholder="Pesquisar tutoriais..."
            value={busca}
            onChangeText={setBusca}
          />
        </View>

        {/* DIFICULDADE + SALVOS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.linhaChips}
        >
          <Chip
            label="Todos"
            ativo={!dificuldade && !soSalvas}
            onPress={() => {
              setDificuldade('');
              setSoSalvas(false);
            }}
          />

          {Object.keys(DIFICULDADES).map((k) => (
            <Chip
              key={k}
              label={DIFICULDADES[k].label}
              ativo={dificuldade === k}
              onPress={() => setDificuldade(dificuldade === k ? '' : k)}
            />
          ))}

          <Chip
            label="♥ Salvos"
            ativo={soSalvas}
            onPress={() => setSoSalvas(!soSalvas)}
          />
        </ScrollView>

        {/* CATEGORIAS */}
        <Text style={styles.secao}>Categorias</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.linhaChips}
        >
          <Chip
            label="Todas"
            ativo={!categoria}
            onPress={() => setCategoria('')}
          />

          {CATEGORIAS.map((c) => (
            <Chip
              key={c}
              label={c}
              ativo={categoria === c}
              onPress={() => setCategoria(categoria === c ? '' : c)}
            />
          ))}
        </ScrollView>

        {/* DESTAQUES */}
        {!temFiltro && destaques.length > 0 && (
          <>
            <Text style={styles.secao}>Projetos em destaque</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {destaques.map((d) => (
                <CardDestaque key={d.id_dica} dica={d} onPress={() => abrir(d)} />
              ))}
            </ScrollView>
          </>
        )}

        {/* LISTA */}
        <View style={styles.tituloLista}>
          <Text style={styles.secaoSemMargem}>
            {temFiltro ? 'Resultados' : 'Todos os tutoriais'}
          </Text>

          {temFiltro && (
            <TouchableOpacity onPress={limpar}>
              <Text style={styles.limpar}>Limpar filtros</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {filtradas.map((d) => (
            <ItemDica
              key={d.id_dica}
              dica={d}
              onPress={() => abrir(d)}
              onFavoritar={() => alternarFavorita(d)}
            />
          ))}

          {carregado && filtradas.length === 0 && (
            <Text style={styles.vazio}>
              {dicas.length === 0
                ? 'Ainda não há dicas. Seja o primeiro a publicar!'
                : 'Nenhum tutorial encontrado.'}
            </Text>
          )}
        </View>

      </ScrollView>

      {/* NOVA DICA */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NovaDica', { usuario })}
      >
        <Ionicons name="add" size={26} color="#FFF" />
        <Text style={styles.fabTexto}>Nova dica</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },

  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13B76B',
    margin: 20,
    padding: 16,
    borderRadius: 20,
  },

  introIcone: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  introTitulo: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  introTexto: {
    color: '#EAFBF3',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },

  search: {
    height: 50,
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },

  input: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 16,
  },

  linhaChips: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#C9B5F5',
    marginRight: 8,
  },

  chipAtivo: {
    backgroundColor: '#6C4AB6',
    borderColor: '#6C4AB6',
  },

  chipTexto: {
    color: '#6C4AB6',
  },

  chipTextoAtivo: {
    color: '#FFF',
    fontWeight: 'bold',
  },

  secao: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 20,
    marginTop: 8,
  },

  secaoSemMargem: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },

  tituloLista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },

  limpar: {
    color: '#6C4AB6',
    fontWeight: '600',
  },

  destaque: {
    width: 220,
    backgroundColor: '#FFF',
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 14,
    marginTop: 12,
    elevation: 3,
  },

  destaqueFoto: {
    width: '100%',
    height: 130,
  },

  destaqueTitulo: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
  },

  selo: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  seloTexto: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  meta: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 18,
    marginBottom: 12,
    elevation: 2,
  },

  itemFoto: {
    width: 84,
    height: 100,
    borderRadius: 14,
    marginRight: 14,
  },

  semFoto: {
    backgroundColor: '#EAFBF3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  itemTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 4,
  },

  itemCategoria: {
    fontSize: 12,
    color: '#9274D5',
    marginTop: 3,
  },

  botaoVer: {
    alignSelf: 'flex-start',
    backgroundColor: '#6C4AB6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 8,
  },

  botaoVerTexto: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  coracao: {
    alignSelf: 'flex-start',
    padding: 4,
  },

  vazio: {
    textAlign: 'center',
    color: '#888',
    marginTop: 30,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C4AB6',
    paddingHorizontal: 18,
    height: 52,
    borderRadius: 26,
    elevation: 6,
  },

  fabTexto: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 6,
  },

});