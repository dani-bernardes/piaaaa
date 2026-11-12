
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
  const [mostrarOpcoes, setMostrarOpcoes] = useState(false);

  async function cadastrarUsuario() {
    if (!nome || !email || !senha || !tipo_usuario) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }

    try {
      const resposta = await fetch("http://172.20.90.209:3000/usuarios", {
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

      Alert.alert(
        resposta.ok ? "Sucesso" : "Erro",
        dados.mensagem || "Não foi possível realizar o cadastro."
      );

      if (resposta.ok) {
        setNome("");
        setEmail("");
        setSenha("");
        setTipoUsuario("");
        setMostrarOpcoes(false);
      }

    } catch (erro) {
      Alert.alert("Erro", "Não foi possível conectar ao servidor.");
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
        autoCapitalize="none"
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

      {/* SELETOR DE TIPO DE USUÁRIO */}

      <TouchableOpacity
        style={styles.input}
        onPress={() => setMostrarOpcoes(!mostrarOpcoes)}
        activeOpacity={0.8}
      >
        <Text style={styles.textoTipo}>
          {tipo_usuario
            ? tipo_usuario === "consumidor"
              ? "Consumidor"
              : tipo_usuario === "brecho"
              ? "Brechó"
              : "Ateliê"
            : "Selecione o tipo de usuário"}
        </Text>
      </TouchableOpacity>

      {mostrarOpcoes && (
        <View style={styles.opcoesContainer}>
          {[
            { label: "Consumidor", value: "consumidor" },
            { label: "Brechó", value: "brecho" },
            { label: "Ateliê", value: "atelie" },
          ].map((opcao) => (
            <TouchableOpacity
              key={opcao.value}
              style={styles.opcao}
              onPress={() => {
                setTipoUsuario(opcao.value);
                setMostrarOpcoes(false);
              }}
            >
              <Text style={styles.textoOpcao}>
                {opcao.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.botao}
        onPress={cadastrarUsuario}
      >
        <Text style={styles.textoBotao}>Criar conta</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>
          Já possui uma conta?{" "}
          <Text style={styles.linkVerde}>Entre</Text>
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
    justifyContent: "center",
  },

  textoTipo: {
    color: "#888",
    fontSize: 14,
  },

  opcoesContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E7C6F3",
    marginBottom: 15,
    overflow: "hidden",
  },

  opcao: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E7C6F3",
  },

  textoOpcao: {
    color: "#555",
    fontSize: 14,
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
