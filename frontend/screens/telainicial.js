import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
export default function HomeScreen({ navigation })  {
  return (
    <ScrollView
    style={{flex:1}}
    contentContainerStyle={{flexGrow:1, padding: 16}}
    showsVerticalScrollIndicator={true}
    >
    <View style={styles.container}>
      <Image
        source={require("../assets/logob.jpeg")}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.card}>
        <View style={styles.icon} />
        <View>
          <Text style={styles.titulo}>Troque</Text>
          <Text style={styles.descricao}>
            Dê nova vida às suas roupas
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.icon} />
        <View>
          <Text style={styles.titulo}>Venda</Text>
          <Text style={styles.descricao}>
            Venda de forma consciente
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.icon} />
        <View>
          <Text style={styles.titulo}>Doe</Text>
          <Text style={styles.descricao}>
            Faça a diferença doando
          </Text>
        </View>
      </View>
  <TouchableOpacity
  style={styles.botaoRoxo}
  onPress={() => navigation.navigate('Cadastro')}
>
  <Text style={styles.textoBotaoRoxo}>Começar agora</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.botaoBranco}
  onPress={() => navigation.navigate('login')}
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
    width: 50,
    height: 50,
    backgroundColor: "#DDD",
    borderRadius: 25,
    marginRight: 15,
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