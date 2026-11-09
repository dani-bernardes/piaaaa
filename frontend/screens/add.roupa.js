import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Image,
  ScrollView, StyleSheet, Alert, Platform, ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";


const TIPOS = [
  { valor: "troca", label: "Troca" },
  { valor: "venda", label: "Venda" },
  { valor: "doacao", label: "Doação" },
];
const CONDICOES = [
  { valor: "novo", label: "Novo" },
  { valor: "pouco usado", label: "Pouco usado" },
  { valor: "usado", label: "Usado" },
];
const CATEGORIAS = ["Camisa", "Blusa", "Calça", "Vestido", "Saia", "Casaco", "Sapato", "Acessório", "Outro"];
const TAMANHOS = ["PP", "P", "M", "G", "GG", "Único"];

// Alert.alert não aparece no navegador, então usamos window.alert na web
function aviso(titulo, mensagem) {
  if (Platform.OS === "web") {
    window.alert(`${titulo}: ${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
}

function Chip({ label, ativo, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, ativo && styles.chipAtivo]}
    >
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AdicionarRoupas({ navigation, route }) {
  const usuario = route.params?.usuario;

  const [fotos, setFotos] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [cor, setCor] = useState("");
  const [material, setMaterial] = useState("");
  const [condicao, setCondicao] = useState("");
  const [tipoOferta, setTipoOferta] = useState("");
  const [preco, setPreco] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function escolherFotos() {
    if (fotos.length >= 5) {
      aviso("Limite", "Você pode adicionar até 5 fotos.");
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], // em SDK antigo: ImagePicker.MediaTypeOptions.Images
      allowsMultipleSelection: true,
      selectionLimit: 5 - fotos.length,
      quality: 0.7,
    });

    if (!resultado.canceled) {
      setFotos([...fotos, ...resultado.assets].slice(0, 5));
    }
  }

  function removerFoto(index) {
    setFotos(fotos.filter((_, i) => i !== index));
  }

  async function salvar() {
    if (!usuario?.id_usuario) {
      aviso("Erro", "Usuário não identificado. Faça login novamente.");
      return;
    }
    if (!titulo.trim() || !categoria || !tipoOferta) {
      aviso("Atenção", "Preencha título, categoria e tipo (troca/venda/doação).");
      return;
    }
    if (tipoOferta === "venda" && !preco.trim()) {
      aviso("Atenção", "Informe o preço da venda.");
      return;
    }

    setEnviando(true);

    try {
      const formData = new FormData();
      formData.append("id_usuario", String(usuario.id_usuario));
      formData.append("titulo", titulo.trim());
      formData.append("descricao", descricao);
      formData.append("categoria", categoria);
      formData.append("tamanho", tamanho);
      formData.append("cor", cor);
      formData.append("material", material);
      formData.append("condicao", condicao);
      formData.append("tipo_oferta", tipoOferta);
      if (tipoOferta === "venda") {
        formData.append("preco", preco.replace(",", "."));
      }

      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        const nome = `foto${i}.jpg`;

        if (Platform.OS === "web") {
          // na web é preciso converter a uri em Blob
          const blob = await (await fetch(foto.uri)).blob();
          formData.append("fotos", blob, nome);
        } else {
          formData.append("fotos", {
            uri: foto.uri,
            name: nome,
            type: foto.mimeType || "image/jpeg",
          });
        }
      }

      // IMPORTANTE: não defina Content-Type, o fetch coloca sozinho com o boundary
      const resposta = await fetch("http://localhost:3000/roupas", {
        method: "POST",
        body: formData,
      });

      const dados = await resposta.json();

      if (resposta.ok && dados.sucesso) {
        aviso("Sucesso", dados.mensagem);
        navigation.goBack(); // a Home recarrega a lista ao voltar
      } else {
        aviso("Erro", dados.mensagem || "Não foi possível cadastrar.");
      }
    } catch (erro) {
      console.log(erro);
      aviso("Erro", "Não foi possível conectar ao servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topo}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#6C4AB6" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Adicionar roupa</Text>
        <View style={{ width: 26 }} />
      </View>

      <Text style={styles.label}>Fotos ({fotos.length}/5)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
        {fotos.map((foto, i) => (
          <View key={i} style={styles.fotoBox}>
            <Image source={{ uri: foto.uri }} style={styles.foto} />
            <TouchableOpacity style={styles.remover} onPress={() => removerFoto(i)}>
              <Ionicons name="close" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        ))}
        {fotos.length < 5 && (
          <TouchableOpacity style={styles.addFoto} onPress={escolherFotos}>
            <Ionicons name="camera-outline" size={30} color="#6C4AB6" />
            <Text style={{ color: "#6C4AB6", fontSize: 12 }}>Adicionar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Text style={styles.label}>Título *</Text>
      <TextInput style={styles.input} placeholder="Ex: Calça jeans" value={titulo} onChangeText={setTitulo} />

      <Text style={styles.label}>Descrição</Text>
      <TextInput
        style={[styles.input, { height: 90, paddingTop: 12, textAlignVertical: "top" }]}
        placeholder="Conte detalhes da peça"
        value={descricao}
        onChangeText={setDescricao}
        multiline
      />

      <Text style={styles.label}>Tipo *</Text>
      <View style={styles.linha}>
        {TIPOS.map((t) => (
          <Chip key={t.valor} label={t.label} ativo={tipoOferta === t.valor} onPress={() => setTipoOferta(t.valor)} />
        ))}
      </View>

      {tipoOferta === "venda" && (
        <>
          <Text style={styles.label}>Preço (R$) *</Text>
          <TextInput
            style={styles.input}
            placeholder="45,00"
            keyboardType="decimal-pad"
            value={preco}
            onChangeText={setPreco}
          />
        </>
      )}

      <Text style={styles.label}>Categoria *</Text>
      <View style={styles.linha}>
        {CATEGORIAS.map((c) => (
          <Chip key={c} label={c} ativo={categoria === c} onPress={() => setCategoria(c)} />
        ))}
      </View>

      <Text style={styles.label}>Tamanho</Text>
      <View style={styles.linha}>
        {TAMANHOS.map((t) => (
          <Chip key={t} label={t} ativo={tamanho === t} onPress={() => setTamanho(t)} />
        ))}
      </View>

      <Text style={styles.label}>Condição</Text>
      <View style={styles.linha}>
        {CONDICOES.map((c) => (
          <Chip key={c.valor} label={c.label} ativo={condicao === c.valor} onPress={() => setCondicao(c.valor)} />
        ))}
      </View>

      <Text style={styles.label}>Cor</Text>
      <TextInput style={styles.input} placeholder="Ex: Azul" value={cor} onChangeText={setCor} />

      <Text style={styles.label}>Material</Text>
      <TextInput style={styles.input} placeholder="Ex: Algodão" value={material} onChangeText={setMaterial} />

      <TouchableOpacity style={[styles.botao, enviando && { opacity: 0.6 }]} onPress={salvar} disabled={enviando}>
        {enviando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.botaoTexto}>Publicar</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#F8F8F8", padding: 20, paddingTop: 50, paddingBottom: 50 },
  topo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  titulo: { fontSize: 22, fontWeight: "bold", color: "#6C4AB6" },
  label: { fontWeight: "600", color: "#333", marginBottom: 6, marginTop: 6 },
  input: {
    height: 50, backgroundColor: "#FFF", borderRadius: 14, paddingHorizontal: 15,
    borderWidth: 1, borderColor: "#E3DAF7", marginBottom: 10,
  },
  linha: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#FFF",
    borderWidth: 1, borderColor: "#C9B5F5", marginRight: 8, marginBottom: 8,
  },
  chipAtivo: { backgroundColor: "#6C4AB6", borderColor: "#6C4AB6" },
  chipTexto: { color: "#6C4AB6" },
  chipTextoAtivo: { color: "#FFF", fontWeight: "bold" },
  fotoBox: { marginRight: 10 },
  foto: { width: 100, height: 120, borderRadius: 12 },
  remover: {
    position: "absolute", top: 5, right: 5, width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,.55)", justifyContent: "center", alignItems: "center",
  },
  addFoto: {
    width: 100, height: 120, borderRadius: 12, borderWidth: 2, borderStyle: "dashed",
    borderColor: "#C9B5F5", justifyContent: "center", alignItems: "center", backgroundColor: "#FFF",
  },
  botao: {
    backgroundColor: "#6C4AB6", height: 55, borderRadius: 28,
    justifyContent: "center", alignItems: "center", marginTop: 20,
  },
  botaoTexto: { color: "#FFF", fontWeight: "bold", fontSize: 17 },
});