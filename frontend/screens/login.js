import { useState } from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Platform
} from 'react-native';

// Alert.alert não aparece no navegador, então usamos window.alert na web
function aviso(titulo, mensagem) {
    if (Platform.OS === 'web') {
        window.alert(`${titulo}\n${mensagem}`);
    } else {
        Alert.alert(titulo, mensagem);
    }
}

export default function Login({ navigation }) {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');

    async function fazerLogin() {
        if (!email || !senha) {
            aviso('Atenção', 'Informe email e senha.');
            return;
        }

        try {
            const resposta = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    senha
                })
            });

            const dados = await resposta.json();

            console.log(dados);

            if (dados.sucesso) {
                navigation.navigate('Home', {
                    usuario: dados.data
                });
            } else {
                aviso('Erro', dados.mensagem || 'Email ou senha incorretos');
            }

        } catch (error) {
            console.log(error);
            aviso('Erro', 'Não foi possível conectar ao servidor.');
        }
    }

    return (
        <View style={styles.container}>

            <Text style={styles.titulo}>Entrar</Text>

            <Text style={styles.subtitulo}>
                Faça login para continuar
            </Text>

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
                onSubmitEditing={fazerLogin}
            />

            <TouchableOpacity
                style={styles.botao}
                onPress={fazerLogin}
            >
                <Text style={styles.textoBotao}>
                    Entrar
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => navigation.navigate('Cadastro')}
            >
                <Text style={styles.link}>
                    Não tem uma conta?{' '}
                    <Text style={styles.linkVerde}>
                        Cadastre-se
                    </Text>
                </Text>
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        justifyContent: "center",
        paddingHorizontal: 25,
    },

    titulo: {
        fontSize: 32,
        color: "#4B7A4B",
        fontWeight: "600",
        marginBottom: 10,
    },

    subtitulo: {
        color: "#9E9E9E",
        marginBottom: 35,
    },

    input: {
        height: 50,
        backgroundColor: "#F5F5F5",
        borderWidth: 1,
        borderColor: "#D8D8D8",
        borderRadius: 25,
        paddingHorizontal: 18,
        marginBottom: 15,
    },

    botao: {
        backgroundColor: "#C8F7D3",
        height: 52,
        borderRadius: 26,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
    },

    textoBotao: {
        fontSize: 16,
        fontWeight: "600",
        color: "#2F4F2F",
    },

    link: {
        textAlign: "center",
        marginTop: 25,
        color: "#666",
    },

    linkVerde: {
        color: "#4B7A4B",
        fontWeight: "bold",
    }
});