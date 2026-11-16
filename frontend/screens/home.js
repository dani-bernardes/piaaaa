import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  SafeAreaView,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';

import { Ionicons, Feather } from '@expo/vector-icons';

const CATEGORIAS = ["Camisa", "Blusa", "Calça", "Vestido", "Saia", "Casaco", "Sapato", "Acessório", "Outro"];
const TAMANHOS = ["PP", "P", "M", "G", "GG", "Único"];

const FILTROS_VAZIOS = { categoria: "", tamanho: "", cor: "", min: "", max: "" };

// tira acentos e deixa minúsculo (assim "calca" encontra "Calça")
function normalizar(texto) {
  return (texto || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

// Card de cada roupa (fica fora do componente para não recriar a cada digitação)
function Card({ item, favorito, onPress, onFavoritar }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {item.imagem ? (
        <Image source={item.imagem} style={styles.imagem} />
      ) : (
        <View style={[styles.imagem, {
          backgroundColor: "#EEE",
          justifyContent: "center",
          alignItems: "center",
        }]}>
          <Ionicons name="shirt-outline" size={40} color="#BBB" />
        </View>
      )}

      <TouchableOpacity style={styles.favorite} onPress={onFavoritar}>
        <Ionicons
          name={favorito ? "heart" : "heart-outline"}
          size={22}
          color={favorito ? "#FF6B8A" : "#FFF"}
        />
      </TouchableOpacity>

      <View style={styles.info}>
        <Text style={styles.tipo}>{item.tipo}</Text>

        <Text style={styles.nome}>{item.nome}</Text>

        {item.preco !== "" && (
          <Text style={styles.preco}>{item.preco}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function Home({ navigation, route }) {
  const usuario = route.params?.usuario;

  const [pesquisa, setPesquisa] = useState("");
  const [roupasBanco, setRoupasBanco] = useState([]);
  const [favoritos, setFavoritos] = useState([]); 

  const [tipoFiltro, setTipoFiltro] = useState(""); 
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [modalAberto, setModalAberto] = useState(false);

  async function carregarRoupas() {
    try {
      const resposta = await fetch("http://localhost:3000/roupas");
      const dados = await resposta.json();

      if (Array.isArray(dados)) {
        const lista = dados.map((r) => ({
          id: "db-" + r.id_roupa,
          id_roupa: r.id_roupa,
          nome: r.titulo,
          tipo:
            r.tipo_oferta === "venda"
              ? "Venda"
              : r.tipo_oferta === "troca"
              ? "Troca"
              : "Doação",
          tipoOferta: r.tipo_oferta,
          preco:
            r.tipo_oferta === "venda" && r.preco != null
              ? "R$ " + Number(r.preco).toFixed(2).replace(".", ",")
              : "",
          precoNumero:
            r.tipo_oferta === "venda" && r.preco != null
              ? Number(r.preco)
              : null,
          categoria: r.categoria,
          tamanho: r.tamanho,
          cor: r.cor,
          material: r.material,
          descricao: r.descricao,
          imagem: r.foto
            ? { uri: `http://localhost:3000/uploads/${r.foto}` }
            : null,
        }));

        setRoupasBanco(lista);
      }
    } catch (erro) {
      console.log("Erro ao carregar roupas:", erro);
    }
  }

  async function carregarFavoritos() {
    if (!usuario?.id_usuario) return;

    try {
      const resposta = await fetch(
        `http://localhost:3000/usuarios/${usuario.id_usuario}/favoritos`
      );
      const dados = await resposta.json();

      if (Array.isArray(dados)) {
        setFavoritos(dados.map((f) => f.id_roupa));
      }
    } catch (erro) {
      console.log("Erro ao carregar favoritos:", erro);
    }
  }

  function carregarTudo() {
    carregarRoupas();
    carregarFavoritos();
  }

  useEffect(() => {
    carregarTudo();

    const unsubscribe = navigation.addListener("focus", carregarTudo);
    return unsubscribe;
  }, [navigation]);

  // favoritar / desfavoritar (atualiza na hora e confirma no servidor)
  async function alternarFavorito(item) {
    if (!item.id_roupa || !usuario?.id_usuario) return; // peças de exemplo não favoritam

    const jaEra = favoritos.includes(item.id_roupa);

    setFavoritos((anterior) =>
      jaEra
        ? anterior.filter((i) => i !== item.id_roupa)
        : [...anterior, item.id_roupa]
    );

    try {
      const resposta = await fetch("http://localhost:3000/favoritos/alternar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: usuario.id_usuario,
          id_roupa: item.id_roupa,
        }),
      });

      if (!resposta.ok) throw new Error("Falha ao favoritar");
    } catch (erro) {
      console.log(erro);

      // se deu erro, desfaz
      setFavoritos((anterior) =>
        jaEra
          ? [...anterior, item.id_roupa]
          : anterior.filter((i) => i !== item.id_roupa)
      );
    }
  }

  const roupasFixas = [
    {
      id: 1,
      nome: "Calça Camuflada",
      tipo: "Venda",
      tipoOferta: "venda",
      preco: "R$ 45,00",
      precoNumero: 45,
      imagem: require("../assets/calca.jpg"),
    },
    {
      id: 2,
      nome: "Calça jeans",
      tipo: "Troca",
      tipoOferta: "troca",
      preco: "",
      precoNumero: null,
      imagem: require("../assets/jeans.jpg"),
    },
    {
      id: 3,
      nome: "Sueter H&M",
      tipo: "Venda",
      tipoOferta: "venda",
      preco: "R$ 70,00",
      precoNumero: 70,
      imagem: require("../assets/sweater.jpg"),
    },
    {
      id: 4,
      nome: "Blusa",
      tipo: "Doação",
      tipoOferta: "doacao",
      preco: "",
      precoNumero: null,
      imagem: require("../assets/blusa.jpg"),
    },
    {
      id: 5,
      nome: "Jeans com detalhes",
      tipo: "Venda",
      tipoOferta: "venda",
      preco: "R$ 60,00",
      precoNumero: 60,
      imagem: require("../assets/jeansrosa.jpg"),
    },
    {
      id: 6,
      nome: "Camisa Social",
      tipo: "Troca",
      tipoOferta: "troca",
      preco: "",
      precoNumero: null,
      imagem: require("../assets/camisa.jpg"),
    },
  ];

  const roupas = [...roupasBanco, ...roupasFixas];

  // ---------- pesquisa e filtros ----------

  function passaFiltros(item) {
    // pesquisa por nome, categoria, descrição, cor ou material
    const termo = normalizar(pesquisa.trim());

    if (termo) {
      const alvo = normalizar(
        [item.nome, item.categoria, item.descricao, item.cor, item.material].join(" ")
      );

      if (!alvo.includes(termo)) return false;
    }

    // modalidade (botões Troca / Venda / Doação)
    if (tipoFiltro && item.tipoOferta !== tipoFiltro) return false;

    if (filtros.categoria && item.categoria !== filtros.categoria) return false;
    if (filtros.tamanho && item.tamanho !== filtros.tamanho) return false;

    if (filtros.cor && !normalizar(item.cor).includes(normalizar(filtros.cor))) {
      return false;
    }

    // preço (só peças à venda têm preço)
    const min = parseFloat(filtros.min.replace(",", "."));
    const max = parseFloat(filtros.max.replace(",", "."));

    if (!isNaN(min) || !isNaN(max)) {
      if (item.precoNumero == null) return false;
      if (!isNaN(min) && item.precoNumero < min) return false;
      if (!isNaN(max) && item.precoNumero > max) return false;
    }

    return true;
  }

  const listaFiltrada = roupas.filter(passaFiltros);

  const qtdFiltrosAvancados = Object.values(filtros).filter((v) => v !== "").length;
  const temFiltro = qtdFiltrosAvancados > 0 || tipoFiltro !== "";

  function alternarTipo(valor) {
    setTipoFiltro(tipoFiltro === valor ? "" : valor);
  }

  function limparFiltros() {
    setFiltros(FILTROS_VAZIOS);
    setTipoFiltro("");
  }

  // abre a tela de detalhes da roupa
  function abrirDetalhes(item) {
    if (item.id_roupa) {
      navigation.navigate("DetalhesRoupa", {
        usuario,
        id_roupa: item.id_roupa,
      });
    } else {
      // peça de exemplo (não está no banco)
      navigation.navigate("DetalhesRoupa", { usuario, demo: item });
    }
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* CABEÇALHO */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.ola} numberOfLines={1}>
            Olá, {usuario?.nome || 'usuário'}
          </Text>

          <Text style={styles.subtitulo}>
            Encontre sua próxima peça 💜
          </Text>
        </View>

        <View style={styles.headerDireita}>
          {/* FAVORITOS */}
          <TouchableOpacity
            style={styles.botaoHeader}
            onPress={() => navigation.navigate("Favoritos", { usuario })}
          >
            <Ionicons name="heart-outline" size={24} color="#FFF" />
          </TouchableOpacity>

          {/* CONVERSAS */}
          <TouchableOpacity
            style={styles.botaoHeader}
            onPress={() => navigation.navigate("Conversas", { usuario })}
          >
            <Ionicons name="chatbubbles-outline" size={24} color="#FFF" />
          </TouchableOpacity>

          {/* PERFIL */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Perfil", { usuario })}
          >
            <Image
              source={require("../assets/perfil.jpg")}
              style={styles.perfil}
            />
          </TouchableOpacity>
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
          placeholder="Pesquisar por nome, categoria, cor..."
          value={pesquisa}
          onChangeText={setPesquisa}
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.botaoFiltro}
          onPress={() => setModalAberto(true)}
        >
          <Ionicons name="options-outline" size={24} color="#6C4AB6" />

          {qtdFiltrosAvancados > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeTexto}>{qtdFiltrosAvancados}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* BOTÕES DE MODALIDADE (funcionam como filtro) */}
      <View style={styles.botoes}>
        <TouchableOpacity
          style={[
            styles.botao,
            { backgroundColor: "#87D8B3" },
            tipoFiltro === "troca" && styles.botaoAtivo,
          ]}
          onPress={() => alternarTipo("troca")}
        >
          <Feather name="refresh-ccw" size={25} color="#FFF" />
          <Text style={styles.botaoTexto}>Troca</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.botao,
            { backgroundColor: "#C9B5F5" },
            tipoFiltro === "venda" && styles.botaoAtivo,
          ]}
          onPress={() => alternarTipo("venda")}
        >
          <Feather name="shopping-bag" size={25} color="#FFF" />
          <Text style={styles.botaoTexto}>Venda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.botao,
            { backgroundColor: "#57B87C" },
            tipoFiltro === "doacao" && styles.botaoAtivo,
          ]}
          onPress={() => alternarTipo("doacao")}
        >
          <Ionicons name="heart" size={25} color="#FFF" />
          <Text style={styles.botaoTexto}>Doação</Text>
        </TouchableOpacity>
      </View>

      {/* LISTA DE ROUPAS */}
      <View style={styles.tituloLista}>
        <Text style={styles.disponiveis}>Disponíveis</Text>

        {temFiltro && (
          <TouchableOpacity onPress={limparFiltros}>
            <Text style={styles.limpar}>Limpar filtros</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={listaFiltrada}
        renderItem={({ item }) => (
          <Card
            item={item}
            favorito={item.id_roupa ? favoritos.includes(item.id_roupa) : false}
            onPress={() => abrirDetalhes(item)}
            onFavoritar={() => alternarFavorito(item)}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.vazio}>Nenhuma peça encontrada.</Text>
        }
      />

      {/* MENU INFERIOR */}
      <View style={styles.bottomBar}>

        {/* HOME */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("Home", { usuario })}
        >
          <Ionicons name="home" size={25} color="#6C4AB6" />
        </TouchableOpacity>

        {/* MAPA */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("Mapa", { usuario })}
        >
          <Ionicons name="map-outline" size={25} color="#555" />
        </TouchableOpacity>

        {/* UPCYCLING */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("Upcycling", { usuario })}
        >
          <Ionicons name="leaf-outline" size={25} color="#555" />
        </TouchableOpacity>

        {/* ADICIONAR ROUPA */}
        <TouchableOpacity
          style={styles.botaoAdicionar}
          onPress={() => navigation.navigate("AdicionarRoupas", { usuario })}
        >
          <Ionicons name="add" size={32} color="#FFF" />
        </TouchableOpacity>

        {/* CARRINHO */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("Carrinho", { usuario })}
        >
          <Ionicons name="cart-outline" size={25} color="#555" />
        </TouchableOpacity>

        {/* PERFIL */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("Perfil", { usuario })}
        >
          <Ionicons name="person-outline" size={25} color="#555" />
        </TouchableOpacity>

      </View>

      {/* FILTROS AVANÇADOS */}
      <Modal
        visible={modalAberto}
        transparent
        animationType="slide"
        onRequestClose={() => setModalAberto(false)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>

            <View style={styles.modalTopo}>
              <Text style={styles.modalTitulo}>Filtros</Text>

              <TouchableOpacity onPress={() => setModalAberto(false)}>
                <Ionicons name="close" size={26} color="#555" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={styles.filtroRotulo}>Categoria</Text>
              <View style={styles.chips}>
                {CATEGORIAS.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    ativo={filtros.categoria === c}
                    onPress={() =>
                      setFiltros({
                        ...filtros,
                        categoria: filtros.categoria === c ? "" : c,
                      })
                    }
                  />
                ))}
              </View>

              <Text style={styles.filtroRotulo}>Tamanho</Text>
              <View style={styles.chips}>
                {TAMANHOS.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    ativo={filtros.tamanho === t}
                    onPress={() =>
                      setFiltros({
                        ...filtros,
                        tamanho: filtros.tamanho === t ? "" : t,
                      })
                    }
                  />
                ))}
              </View>

              <Text style={styles.filtroRotulo}>Cor</Text>
              <TextInput
                style={styles.inputFiltro}
                placeholder="Ex: azul"
                value={filtros.cor}
                onChangeText={(v) => setFiltros({ ...filtros, cor: v })}
              />

              <Text style={styles.filtroRotulo}>Preço (R$)</Text>
              <View style={styles.linhaPreco}>
                <TextInput
                  style={[styles.inputFiltro, { flex: 1 }]}
                  placeholder="Mínimo"
                  keyboardType="decimal-pad"
                  value={filtros.min}
                  onChangeText={(v) => setFiltros({ ...filtros, min: v })}
                />

                <Text style={{ marginHorizontal: 10, color: "#888" }}>até</Text>

                <TextInput
                  style={[styles.inputFiltro, { flex: 1 }]}
                  placeholder="Máximo"
                  keyboardType="decimal-pad"
                  value={filtros.max}
                  onChangeText={(v) => setFiltros({ ...filtros, max: v })}
                />
              </View>

              <Text style={styles.dicaPreco}>
                O filtro de preço mostra apenas peças à venda.
              </Text>

            </ScrollView>

            <View style={styles.modalRodape}>
              <TouchableOpacity style={styles.botaoLimpar} onPress={limparFiltros}>
                <Text style={styles.botaoLimparTexto}>Limpar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botaoAplicar}
                onPress={() => setModalAberto(false)}
              >
                <Text style={styles.botaoAplicarTexto}>
                  Ver {listaFiltrada.length} peça(s)
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  header: {
    backgroundColor: "#6C4AB6",
    paddingTop: 25,
    paddingBottom: 25,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 6,
  },

  headerDireita: {
    flexDirection: "row",
    alignItems: "center",
  },

  botaoHeader: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  ola: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFF",
  },

  subtitulo: {
    color: "#EDE7FF",
    fontSize: 15,
    marginTop: 4,
  },

  perfil: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#DDD",
  },

  search: {
    height: 50,
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
  },

  input: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 16,
  },

  botaoFiltro: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },

  badge: {
    position: "absolute",
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#6C4AB6",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },

  badgeTexto: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },

  botoes: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },

  botao: {
    width: 95,
    height: 80,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },

  botaoAtivo: {
    borderWidth: 3,
    borderColor: "#6C4AB6",
  },

  botaoTexto: {
    color: "#FFF",
    fontWeight: "bold",
    marginTop: 6,
  },

  tituloLista: {
    marginHorizontal: 20,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  disponiveis: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },

  limpar: {
    color: "#6C4AB6",
    fontWeight: "600",
  },

  vazio: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
  },

  card: {
    backgroundColor: "#FFF",
    width: "46%",
    marginHorizontal: "2%",
    marginBottom: 18,
    borderRadius: 18,
    overflow: "hidden",
    elevation: 4,
  },

  imagem: {
    width: "100%",
    height: 180,
  },

  favorite: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,.35)",
    justifyContent: "center",
    alignItems: "center",
  },

  info: {
    padding: 12,
  },

  tipo: {
    fontSize: 13,
    color: "#777",
  },

  nome: {
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 4,
  },

  preco: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#6C4AB6",
    marginTop: 6,
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderColor: "#EEE",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    elevation: 10,
  },

  menuItem: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  botaoAdicionar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6C4AB6",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },

  // ----- modal de filtros -----

  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.4)",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  modalCard: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "85%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },

  modalTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  modalTitulo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#6C4AB6",
  },

  filtroRotulo: {
    fontWeight: "600",
    color: "#333",
    marginTop: 14,
    marginBottom: 8,
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#C9B5F5",
    marginRight: 8,
    marginBottom: 8,
  },

  chipAtivo: {
    backgroundColor: "#6C4AB6",
    borderColor: "#6C4AB6",
  },

  chipTexto: {
    color: "#6C4AB6",
  },

  chipTextoAtivo: {
    color: "#FFF",
    fontWeight: "bold",
  },

  inputFiltro: {
    height: 46,
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E3DAF7",
  },

  linhaPreco: {
    flexDirection: "row",
    alignItems: "center",
  },

  dicaPreco: {
    color: "#999",
    fontSize: 12,
    marginTop: 6,
    marginBottom: 10,
  },

  modalRodape: {
    flexDirection: "row",
    marginTop: 12,
  },

  botaoLimpar: {
    paddingHorizontal: 22,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#C9B5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  botaoLimparTexto: {
    color: "#6C4AB6",
    fontWeight: "bold",
  },

  botaoAplicar: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#6C4AB6",
    justifyContent: "center",
    alignItems: "center",
  },

  botaoAplicarTexto: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },

});