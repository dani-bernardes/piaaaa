import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
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

const DIFICULDADES = [
  { valor: 'facil', label: 'Fácil' },
  { valor: 'medio', label: 'Médio' },
  { valor: 'dificil', label: 'Difícil' },
];

function aviso(titulo, mensagem) {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n${mensagem}`);
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
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function NovaDica({ navigation, route }) {
  const usuario = route.params?.usuario;
  const idDica = route.params?.id_dica; // se vier, é edição
  const editando = !!idDica;

  const [fotoNova, setFotoNova] = useState(null); // foto escolhida agora
  const [fotoAtual, setFotoAtual] = useState(null); // foto que já estava salva

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [dificuldade, setDificuldade] = useState('');
  const [tempo, setTempo] = useState('');
  const [materiais, setMateriais] = useState('');
  const [ferramentas, setFerramentas] = useState('');
  const [passos, setPassos] = useState(['']);

  const [carregando, setCarregando] = useState(editando);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: editando ? 'Editar dica' : 'Nova dica' });
  }, []);

  // no modo edição, carrega os dados da dica
  useEffect(() => {
    if (!editando) return;

    async function carregar() {
      try {
        const resposta = await fetch(`${BASE}/dicas/${idDica}`);
        const dados = await resposta.json();

        if (!resposta.ok) {
          aviso('Erro', dados.mensagem || 'Dica não encontrada.');
          navigation.goBack();
          return;
        }

        if (dados.id_usuario !== usuario?.id_usuario) {
          aviso('Atenção', 'Você só pode editar as suas dicas.');
          navigation.goBack();
          return;
        }

        setTitulo(dados.titulo);
        setDescricao(dados.descricao || '');
        setCategoria(dados.categoria || '');
        setDificuldade(dados.dificuldade);
        setTempo(dados.tempo_minutos ? String(dados.tempo_minutos) : '');
        setMateriais(dados.materiais || '');
        setFerramentas(dados.ferramentas || '');
        setFotoAtual(dados.foto);
        setPassos(
          dados.passos.length > 0 ? dados.passos.map((p) => p.descricao) : ['']
        );
      } catch (erro) {
        console.log(erro);
        aviso('Erro', 'Não foi possível conectar ao servidor.');
        navigation.goBack();
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, []);

  async function escolherFoto() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // em SDK antigo: ImagePicker.MediaTypeOptions.Images
      quality: 0.7,
    });

    if (!resultado.canceled) {
      setFotoNova(resultado.assets[0]);
    }
  }

  function atualizarPasso(indice, valor) {
    setPassos(passos.map((p, i) => (i === indice ? valor : p)));
  }

  function removerPasso(indice) {
    setPassos(passos.filter((_, i) => i !== indice));
  }

  async function salvar() {
    if (!usuario?.id_usuario) {
      aviso('Erro', 'Usuário não identificado. Faça login novamente.');
      return;
    }

    const passosLimpos = passos.map((p) => p.trim()).filter(Boolean);

    if (!titulo.trim() || !categoria || !dificuldade) {
      aviso('Atenção', 'Preencha título, categoria e dificuldade.');
      return;
    }

    if (passosLimpos.length === 0) {
      aviso('Atenção', 'Adicione pelo menos um passo.');
      return;
    }

    setEnviando(true);

    try {
      const formData = new FormData();
      formData.append('id_usuario', String(usuario.id_usuario));
      formData.append('titulo', titulo.trim());
      formData.append('descricao', descricao);
      formData.append('categoria', categoria);
      formData.append('dificuldade', dificuldade);
      formData.append('tempo_minutos', tempo);
      formData.append('materiais', materiais);
      formData.append('ferramentas', ferramentas);
      formData.append('passos', JSON.stringify(passosLimpos));

      if (fotoNova) {
        if (Platform.OS === 'web') {
          const blob = await (await fetch(fotoNova.uri)).blob();
          formData.append('foto', blob, 'dica.jpg');
        } else {
          formData.append('foto', {
            uri: fotoNova.uri,
            name: 'dica.jpg',
            type: fotoNova.mimeType || 'image/jpeg',
          });
        }
      }

      // IMPORTANTE: não defina Content-Type, o fetch coloca sozinho com o boundary
      const resposta = await fetch(
        editando ? `${BASE}/dicas/${idDica}` : `${BASE}/dicas`,
        { method: editando ? 'PUT' : 'POST', body: formData }
      );

      const dados = await resposta.json();

      if (resposta.ok && dados.sucesso) {
        aviso('Sucesso', dados.mensagem);
        navigation.goBack();
      } else {
        aviso('Erro', dados.mensagem || 'Não foi possível salvar.');
      }
    } catch (erro) {
      console.log(erro);
      aviso('Erro', 'Não foi possível conectar ao servidor.');
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#6C4AB6" />
      </View>
    );
  }

  const fotoMostrada = fotoNova
    ? fotoNova.uri
    : fotoAtual
    ? `${BASE}/uploads/${fotoAtual}`
    : null;

  return (
    <ScrollView
      style={{ backgroundColor: '#F8F8F8' }}
      contentContainerStyle={styles.container}
    >

      <Text style={styles.label}>Foto do resultado</Text>

      <TouchableOpacity style={styles.areaFoto} onPress={escolherFoto}>
        {fotoMostrada ? (
          <Image source={{ uri: fotoMostrada }} style={styles.foto} />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="camera-outline" size={34} color="#6C4AB6" />
            <Text style={{ color: '#6C4AB6', marginTop: 4 }}>Adicionar foto</Text>
          </View>
        )}
      </TouchableOpacity>

      {fotoMostrada && (
        <TouchableOpacity onPress={escolherFoto}>
          <Text style={styles.trocarFoto}>Trocar foto</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>Título *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Jeans viram shorts"
        value={titulo}
        onChangeText={setTitulo}
        maxLength={100}
      />

      <Text style={styles.label}>Descrição</Text>
      <TextInput
        style={[styles.input, styles.inputGrande]}
        placeholder="Conte sobre a transformação"
        value={descricao}
        onChangeText={setDescricao}
        multiline
      />

      <Text style={styles.label}>Categoria *</Text>
      <View style={styles.linha}>
        {CATEGORIAS.map((c) => (
          <Chip
            key={c}
            label={c}
            ativo={categoria === c}
            onPress={() => setCategoria(c)}
          />
        ))}
      </View>

      <Text style={styles.label}>Dificuldade *</Text>
      <View style={styles.linha}>
        {DIFICULDADES.map((d) => (
          <Chip
            key={d.valor}
            label={d.label}
            ativo={dificuldade === d.valor}
            onPress={() => setDificuldade(d.valor)}
          />
        ))}
      </View>

      <Text style={styles.label}>Tempo estimado (minutos)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 30"
        keyboardType="number-pad"
        value={tempo}
        onChangeText={(v) => setTempo(v.replace(/[^0-9]/g, ''))}
      />

      <Text style={styles.label}>Materiais (um por linha)</Text>
      <TextInput
        style={[styles.input, styles.inputGrande]}
        placeholder={'Calça jeans velha\nLinha resistente'}
        value={materiais}
        onChangeText={setMateriais}
        multiline
      />

      <Text style={styles.label}>Ferramentas (uma por linha)</Text>
      <TextInput
        style={[styles.input, styles.inputGrande]}
        placeholder={'Tesoura\nFita métrica'}
        value={ferramentas}
        onChangeText={setFerramentas}
        multiline
      />

      <Text style={styles.label}>Passo a passo *</Text>

      {passos.map((passo, i) => (
        <View key={i} style={styles.passoLinha}>
          <View style={styles.passoNumero}>
            <Text style={styles.passoNumeroTexto}>{i + 1}</Text>
          </View>

          <TextInput
            style={[styles.input, styles.inputPasso]}
            placeholder={`Descreva o passo ${i + 1}`}
            value={passo}
            onChangeText={(v) => atualizarPasso(i, v)}
            multiline
          />

          {passos.length > 1 && (
            <TouchableOpacity onPress={() => removerPasso(i)} style={{ padding: 8 }}>
              <Ionicons name="trash-outline" size={22} color="#C62828" />
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={styles.botaoAddPasso}
        onPress={() => setPassos([...passos, ''])}
      >
        <Ionicons name="add-circle-outline" size={22} color="#6C4AB6" />
        <Text style={styles.botaoAddPassoTexto}>Adicionar passo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.botao, enviando && { opacity: 0.6 }]}
        onPress={salvar}
        disabled={enviando}
      >
        {enviando ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.botaoTexto}>
            {editando ? 'Salvar alterações' : 'Publicar dica'}
          </Text>
        )}
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    padding: 20,
    paddingBottom: 50,
  },

  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },

  label: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },

  input: {
    minHeight: 50,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E3DAF7',
  },

  inputGrande: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  areaFoto: {
    height: 190,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#C9B5F5',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  foto: {
    width: '100%',
    height: '100%',
  },

  trocarFoto: {
    color: '#6C4AB6',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },

  linha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#C9B5F5',
    marginRight: 8,
    marginBottom: 8,
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

  passoLinha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  passoNumero: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6C4AB6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 10,
  },

  passoNumeroTexto: {
    color: '#FFF',
    fontWeight: 'bold',
  },

  inputPasso: {
    flex: 1,
    textAlignVertical: 'top',
  },

  botaoAddPasso: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C9B5F5',
    borderRadius: 14,
    height: 46,
    backgroundColor: '#FFF',
  },

  botaoAddPassoTexto: {
    color: '#6C4AB6',
    fontWeight: '600',
    marginLeft: 6,
  },

  botao: {
    backgroundColor: '#6C4AB6',
    height: 55,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 26,
  },

  botaoTexto: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 17,
  },

});