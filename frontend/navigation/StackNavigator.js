import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator } from '@react-navigation/native-stack';

import Cadastro from '../screens/cadastro';
import telainicial from '../screens/telainicial';
import Login from '../screens/login';
import Home from '../screens/home';
import AdicionarRoupas from '../screens/add.roupa';
import Upcycling from '../screens/upcycling';
import Carrinho from '../screens/carrinho';
import Perfil from '../screens/perfil';
import Mapa from '../screens/mapa';
import DetalhesRoupa from '../screens/detalhesroupas';
import Chat from '../screens/chat';
import Conversas from '../screens/conversas';

const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  return (
    <NavigationContainer>
       <Stack.Navigator>

       <Stack.Screen name="telainicial" 
        component={telainicial} />

        <Stack.Screen name="Cadastro" component={Cadastro} />
      
      <Stack.Screen name="login" 
        component={Login} />
     
       <Stack.Screen
    name="Home"
    component={Home}
/>
      <Stack.Screen
  name="AdicionarRoupas"
  component={AdicionarRoupas}
  options={{ headerShown: false }}
/>
<Stack.Screen name="Mapa" component={Mapa} />
<Stack.Screen name="Upcycling" component={Upcycling} />
<Stack.Screen name="Carrinho" component={Carrinho} />
<Stack.Screen name="Perfil" component={Perfil} />

<Stack.Screen name="DetalhesRoupa" component={DetalhesRoupa} options={{ title: 'Detalhes' }} />
<Stack.Screen name="Chat" component={Chat} options={{ title: 'Conversa' }} />
<Stack.Screen name="Conversas" component={Conversas} options={{ title: 'Conversas' }} />
     </Stack.Navigator>


    </NavigationContainer>



);
}
