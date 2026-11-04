import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  SafeAreaView,
  TextInput,
} from 'react-native';

import { Ionicons, Feather } from '@expo/vector-icons';

export default function Home({ navigation, route }) {
  const usuario = route.params?.usuario;

  const [pesquisa, setPesquisa] = useState("");

  const roupas = [

    {
      id: 1,
      nome: "Calça Camuflada",
      tipo: "Venda",
      preco: "R$ 45,00",
      imagem: require("../assets/calca.jpg"),
    },

    {
      id: 2,
      nome: "Calça jeans",
      tipo: "Troca",
      preco: "",
      imagem: require("../assets/jeans.jpg"),
    },

    {
      id: 3,
      nome: "Sueter H&M",
      tipo: "Venda",
      preco: "R$ 70,00",
      imagem: require("../assets/sweater.jpg"),
    },

    {
      id: 4,
      nome: "Blusa",
      tipo: "Doação",
      preco: "",
      imagem: require("../assets/blusa.jpg"),
    },

    {
      id: 5,
      nome: "Jeans com detalhes",
      tipo: "Venda",
      preco: "R$ 60,00",
      imagem: require("../assets/jeansrosa.jpg"),
    },

    {
      id: 6,
      nome: "Camisa Social",
      tipo: "Troca",
      preco: "",
      imagem: require("../assets/camisa.jpg"),
    }

  ];

  function Card({ item }) {

    return (

      <TouchableOpacity style={styles.card}>

        <Image
          source={item.imagem}
          style={styles.imagem}
        />

        <TouchableOpacity style={styles.favorite}>

          <Ionicons
            name="heart-outline"
            size={22}
            color="#FFF"
          />

        </TouchableOpacity>

        <View style={styles.info}>

          <Text style={styles.tipo}>
            {item.tipo}
          </Text>

          <Text style={styles.nome}>
            {item.nome}
          </Text>

          {
            item.preco != "" &&

            <Text style={styles.preco}>
              {item.preco}
            </Text>

          }

        </View>

      </TouchableOpacity>

    );

  }

  return (

    <SafeAreaView style={styles.container}>

      <View style={styles.header}>

        <View>

          <Text style={styles.ola}>
               Olá, {usuario?.nome || 'usuário'}
                   </Text>

          <Text style={styles.subtitulo}>
            Encontre sua próxima peça 💜
          </Text>

        </View>

        <TouchableOpacity>

          <Image
            source={require("../assets/perfil.jpg")}
            style={styles.perfil}
          />

        </TouchableOpacity>

      </View>

      <View style={styles.search}>

        <Ionicons
          name="search"
          size={22}
          color="#777"
          style={{ marginLeft: 12 }}
        />

        <TextInput
          placeholder="Pesquisar roupa..."
          value={pesquisa}
          onChangeText={setPesquisa}
          style={styles.input}
        />

      </View>

      <View style={styles.botoes}>

        <TouchableOpacity
          style={[styles.botao, { backgroundColor: "#87D8B3" }]}
        >

          <Feather
            name="refresh-ccw"
            size={25}
            color="#FFF"
          />

          <Text style={styles.botaoTexto}>
            Troca
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botao, { backgroundColor: "#C9B5F5" }]}
        >

          <Feather
            name="shopping-bag"
            size={25}
            color="#FFF"
          />

          <Text style={styles.botaoTexto}>
            Venda
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botao, { backgroundColor: "#57B87C" }]}
        >

          <Ionicons
            name="heart"
            size={25}
            color="#FFF"
          />

          <Text style={styles.botaoTexto}>
            Doação
          </Text>

        </TouchableOpacity>

      </View>

      <View style={styles.tituloLista}>

        <Text style={styles.disponiveis}>
          Disponíveis
        </Text>

      </View>

      <FlatList
        data={roupas}
        renderItem={({ item }) => <Card item={item} />}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
      />
            <View style={styles.bottomBar}>

        <TouchableOpacity>
          <Ionicons
            name="home"
            size={28}
            color="#6C4AB6"
          />
        </TouchableOpacity>

        <TouchableOpacity>
          <Feather
            name="search"
            size={24}
            color="#555"
          />
        </TouchableOpacity>

       
<TouchableOpacity
  onPress={() => {
    navigation.navigate("AdicionarRoupas", {
      usuario: usuario
    });
  }}
  style={{ padding: 10 }}
>
  <Ionicons
    name="add-circle"
    size={45}
    color="#6C4AB6"
  />
</TouchableOpacity>


        <TouchableOpacity>
          <Ionicons
            name="heart-outline"
            size={25}
            color="#555"
          />
        </TouchableOpacity>

        <TouchableOpacity>
          <Ionicons
            name="person-outline"
            size={25}
            color="#555"
          />
        </TouchableOpacity>

      </View>

    </SafeAreaView>

  );

}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#F8F8F8"
},

header:{
backgroundColor:"#6C4AB6",
paddingTop:25,
paddingBottom:25,
paddingHorizontal:20,
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center",
borderBottomLeftRadius:25,
borderBottomRightRadius:25,
elevation:6
},

ola:{
fontSize:26,
fontWeight:"bold",
color:"#FFF"
},

subtitulo:{
color:"#EDE7FF",
fontSize:15,
marginTop:4
},

perfil:{
width:55,
height:55,
borderRadius:28,
backgroundColor:"#DDD"
},

search:{
height:50,
backgroundColor:"#FFF",
marginHorizontal:20,
marginTop:20,
marginBottom:20,
borderRadius:25,
flexDirection:"row",
alignItems:"center",
elevation:3
},

input:{
flex:1,
paddingHorizontal:10,
fontSize:16
},

botoes:{
flexDirection:"row",
justifyContent:"space-around",
marginBottom:20
},

botao:{
width:95,
height:80,
borderRadius:18,
justifyContent:"center",
alignItems:"center",
elevation:3
},

botaoTexto:{
color:"#FFF",
fontWeight:"bold",
marginTop:6
},

tituloLista:{
marginHorizontal:20,
marginBottom:10
},

disponiveis:{
fontSize:20,
fontWeight:"bold",
color:"#333"
},

card:{
backgroundColor:"#FFF",
width:"46%",
marginHorizontal:"2%",
marginBottom:18,
borderRadius:18,
overflow:"hidden",
elevation:4
},

imagem:{
width:"100%",
height:180
},

favorite:{
position:"absolute",
top:10,
right:10,
width:35,
height:35,
borderRadius:20,
backgroundColor:"rgba(0,0,0,.35)",
justifyContent:"center",
alignItems:"center"
},

info:{
padding:12
},

tipo:{
fontSize:13,
color:"#777"
},

nome:{
fontSize:17,
fontWeight:"bold",
marginTop:4
},

preco:{
fontSize:22,
fontWeight:"bold",
color:"#6C4AB6",
marginTop:6
},

bottomBar:{
position:"absolute",
bottom:0,
left:0,
right:0,
height:70,
backgroundColor:"#FFF",
borderTopWidth:1,
borderColor:"#EEE",
flexDirection:"row",
justifyContent:"space-around",
alignItems:"center",
elevation:10
}

});