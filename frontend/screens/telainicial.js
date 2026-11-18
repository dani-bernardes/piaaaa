import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

// As imagens precisam existir na pasta assets, com exatamente estes nomes.
const OPCOES = [
  {
    titulo: "Troque",
    descricao: "Dê nova vida às suas roupas",
    imagem: require("../assets/recitela.jpg"),
  },
  {
    titulo: "Venda",
    descricao: "Venda de forma consciente",
    imagem: require("../assets/troque.jpg"),
  },
  {
    titulo: "Doe",
    descricao: "Faça a diferença doando",
    imagem: require("../assets/doe.jpg"),
  },
];

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, padding: 16 }}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.container}>
        <Image
          source={require("../assets/logob.jpeg")}
          style={styles.logo}
          resizeMode="contain"
        />

        {OPCOES.map((opcao) => (
          <View key={opcao.titulo} style={styles.card}>
            <Image
              source={opcao.imagem}
              style={styles.icon}
              resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>{opcao.titulo}</Text>
              <Text style={styles.descricao}>{opcao.descricao}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.botaoRoxo}
          onPress={() => navigation.navigate("Cadastro")}
        >
          <Text style={styles.textoBotaoRoxo}>Começar agora</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoBranco}
          onPress={() => navigation.navigate("login")}
        >
          <Text style={styles.textoBotaoBranco}>Já tenho uma conta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F4F7",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },

  logo: {
    width: 400,
    height: 300,
    marginBottom: 4,
  },

  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },

  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 15,
    backgroundColor: "#EEE",
  },

  titulo: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4B2E83",
  },

  descricao: {
    fontSize: 15,
    color: "#666",
    marginTop: 3,
  },

  botaoRoxo: {
    width: "100%",
    backgroundColor: "#6A3DB8",
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 25,
  },

  textoBotaoRoxo: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  botaoBranco: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#6A3DB8",
  },

  textoBotaoBranco: {
    color: "#6A3DB8",
    fontWeight: "bold",
    fontSize: 16,
  },
});