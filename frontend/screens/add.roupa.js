
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

export default function AdicionarRoupas({ navigation, route }) {
  const usuario = route.params?.usuario;

  const [tipoOferta, setTipoOferta] = useState('venda');
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [cor, setCor] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [fotos, setFotos] = useState([]);

  async function selecionarFotos() {
    if (fotos.length >= 5) {
      Alert.alert('Limite atingido', 'Você pode adicionar até 5 fotos.');
      return;
    }

    const permissao =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        'Permissão necessária',
        'Permita o acesso à galeria para escolher as fotos.'
      );
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - fotos.length,
      quality: 0.8,
    });

    if (!resultado.canceled) {
      setFotos((atuais) => [
        ...atuais,
        ...resultado.assets.filter(
          (nova) => !atuais.some((foto) => foto.uri === nova.uri)
        ),
      ].slice(0, 5));
    }
  }

  function removerFoto(uri) {
    setFotos((atuais) => atuais.filter((foto) => foto.uri !== uri));
  }

  async function publicar() {
    if (!titulo.trim() || !categoria.trim()) {
      Alert.alert(
        'Campos obrigatórios',
        'Preencha o nome e a categoria da roupa.'
      );
      return;
    }

    if (tipoOferta === 'venda' && !preco.trim()) {
      Alert.alert(
        'Preço obrigatório',
        'Informe o preço para vender a roupa.'
      );
      return;
    }

    if (!usuario?.id_usuario) {
      Alert.alert(
        'Erro',
        'Não foi possível identificar o usuário logado.'
      );
      return;
    }

    try {
      const formulario = new FormData();

      formulario.append('id_usuario', String(usuario.id_usuario));
      formulario.append('titulo', titulo);
      formulario.append('categoria', categoria);
      formulario.append('cor', cor);
      formulario.append('tamanho', tamanho);
      formulario.append('descricao', descricao);
      formulario.append('tipo_oferta', tipoOferta);

      if (tipoOferta === 'venda') {
        const valor = preco.replace(',', '.');
        formulario.append('preco', valor);
      }

      fotos.forEach((foto, index) => {
        formulario.append('fotos', {
          uri: foto.uri,
          name: `foto_${index}.jpg`,
          type: 'image/jpeg',
        });
      });

      const resposta = await fetch(
        'http://172.20.90.160:3000/roupas',
        {
          method: 'POST',
          body: formulario,
        }
      );

      const dados = await resposta.json();

      if (resposta.ok) {
        Alert.alert(
          'Sucesso!',
          'Roupa cadastrada com sucesso!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Erro',
          dados.mensagem || 'Não foi possível cadastrar a roupa.'
        );
      }

    } catch (error) {
      console.log('Erro ao publicar roupa:', error);

      Alert.alert(
        'Erro',
        'Não foi possível conectar ao servidor.'
      );
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conteudo}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.voltar}
        >
          <Text style={styles.voltarTexto}>‹</Text>
          <Text style={styles.tituloTela}>Adicionar item</Text>
        </TouchableOpacity>

        <View style={styles.opcoes}>
          {[
            { valor: 'venda', texto: 'Vender' },
            { valor: 'troca', texto: 'Trocar' },
            { valor: 'doacao', texto: 'Doar' },
          ].map((opcao) => (
            <TouchableOpacity
              key={opcao.valor}
              style={[
                styles.opcao,
                tipoOferta === opcao.valor && styles.opcaoAtiva,
              ]}
              onPress={() => setTipoOferta(opcao.valor)}
            >
              <Text
                style={[
                  styles.textoOpcao,
                  tipoOferta === opcao.valor && styles.textoOpcaoAtiva,
                ]}
              >
                {opcao.texto}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.secao}>Fotos do item</Text>

        <Text style={styles.ajuda}>
          Adicione até 5 fotos da roupa ({fotos.length}/5).
        </Text>

        <View style={styles.areaFotos}>
          <View style={styles.listaFotos}>
            {fotos.map((foto) => (
              <View key={foto.uri} style={styles.fotoContainer}>
                <Image
                  source={{ uri: foto.uri }}
                  style={styles.miniatura}
                />

                <TouchableOpacity
                  style={styles.removerFoto}
                  onPress={() => removerFoto(foto.uri)}
                >
                  <Text style={styles.textoRemover}>×</Text>
                </TouchableOpacity>
              </View>
            ))}

            {fotos.length < 5 && (
              <TouchableOpacity
                style={styles.botaoFoto}
                onPress={selecionarFotos}
              >
                <Text style={styles.mais}>+</Text>
                <Text style={styles.textoBotaoFoto}>
                  Adicionar foto
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.secao}>Informações do item</Text>

        <TextInput
          style={styles.campo}
          placeholder="Nome da peça"
          value={titulo}
          onChangeText={setTitulo}
        />

        <TextInput
          style={styles.campo}
          placeholder="Categoria (ex.: blusa, calça)"
          value={categoria}
          onChangeText={setCategoria}
        />

        <View style={styles.linha}>
          <TextInput
            style={[styles.campo, styles.metade]}
            placeholder="Cor"
            value={cor}
            onChangeText={setCor}
          />

          <TextInput
            style={[styles.campo, styles.metade]}
            placeholder="Tamanho"
            value={tamanho}
            onChangeText={setTamanho}
          />
        </View>

        <TextInput
          style={[styles.campo, styles.descricao]}
          placeholder="Descrição da peça"
          value={descricao}
          onChangeText={setDescricao}
          multiline
        />

        {tipoOferta === 'venda' && (
          <TextInput
            style={[styles.campo, styles.preco]}
            placeholder="Preço (R$)"
            value={preco}
            onChangeText={setPreco}
            keyboardType="decimal-pad"
          />
        )}

        <TouchableOpacity
          style={styles.publicar}
          onPress={publicar}
        >
          <Text style={styles.textoPublicar}>Publicar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  conteudo: {
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 30,
  },
  voltar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  voltarTexto: {
    fontSize: 32,
    color: '#8B6CE0',
    marginRight: 16,
  },
  tituloTela: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B6CE0',
  },
  opcoes: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  opcao: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#E9DFF8',
    marginRight: 3,
    borderRadius: 9,
  },
  opcaoAtiva: {
    backgroundColor: '#8B6CE0',
  },
  textoOpcao: {
    color: '#553B83',
    fontWeight: '500',
  },
  textoOpcaoAtiva: {
    color: '#FFFFFF',
  },
  secao: {
    fontSize: 16,
    color: '#176B2C',
    fontWeight: '600',
    marginBottom: 4,
  },
  ajuda: {
    fontSize: 11,
    color: '#999999',
    marginBottom: 10,
  },
  areaFotos: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 12,
    padding: 10,
    marginBottom: 22,
  },
  listaFotos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  fotoContainer: {
    position: 'relative',
  },
  miniatura: {
    width: 85,
    height: 85,
    borderRadius: 10,
  },
  removerFoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B6CE0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoRemover: {
    color: '#FFFFFF',
    fontSize: 19,
    lineHeight: 22,
  },
  botaoFoto: {
    width: 100,
    height: 85,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#8B6CE0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  mais: {
    fontSize: 28,
    color: '#8B6CE0',
  },
  textoBotaoFoto: {
    fontSize: 11,
    color: '#8B6CE0',
    textAlign: 'center',
  },
  campo: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    fontSize: 14,
    marginBottom: 10,
    color: '#222222',
  },
  linha: {
    flexDirection: 'row',
    gap: 8,
  },
  metade: {
    flex: 1,
  },
  descricao: {
    minHeight: 85,
    textAlignVertical: 'top',
  },
  preco: {
    width: 145,
  },
  publicar: {
    backgroundColor: '#8B6CE0',
    borderRadius: 13,
    padding: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  textoPublicar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
