import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";

export default function Cadastro({ navigation }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
 const [tipo_usuario, setTipoUsuario] = useState("");

  async function cadastrarUsuario() {
    try {
      const resposta = await fetch("http://172.20.90.235:3000/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          email,
          senha,
          tipo_usuario,
        }),
      });

      const dados = await resposta.json();

      Alert.alert(dados.mensagem);

      setNome("");
      setEmail("");
      setSenha("");
      setTipoUsuario("");
    } catch (erro) {
      Alert.alert("Erro ao cadastrar usuário");
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.titulo}>Criar conta</Text>
      <Text style={styles.subtitulo}>
        Junte-se à comunidade Rewear-it
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nome completo"
        value={nome}
        onChangeText={setNome}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <TextInput
        style={styles.input}
        placeholder="Tipo de usuário"
        value={tipo_usuario}
        onChangeText={setTipoUsuario}
      />


      <TouchableOpacity
        style={styles.botao}
        onPress={cadastrarUsuario}
      >
        <Text style={styles.textoBotao}>Criar conta</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>
          Já possui uma conta? <Text style={styles.linkVerde}>Entre</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 25,
    paddingTop: 80,
    paddingBottom: 40,
  },

  titulo: {
    fontSize: 30,
    color: "#4B7A4B",
    fontWeight: "600",
    marginBottom: 8,
  },

  subtitulo: {
    color: "#A0A0A0",
    marginBottom: 30,
  },

  input: {
    height: 50,
    backgroundColor: "#F5F5F5",
    borderRadius: 25,
    paddingHorizontal: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E7C6F3",
  },

  botao: {
    backgroundColor: "#E8B6E9",
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },

  textoBotao: {
    color: "#333",
    fontWeight: "600",
    fontSize: 16,
  },

  link: {
    textAlign: "center",
    marginTop: 25,
    color: "#666",
  },

  linkVerde: {
    color: "#3E6E3E",
    fontWeight: "bold",
  },
});