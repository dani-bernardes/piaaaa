import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator } from '@react-navigation/native-stack';

import Cadastro from '../screens/cadastro';
import listaUsuarios from '../screens/listaUsuarios';
import login from '../screens/login';

const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Cadastro" component={Cadastro} />
      
      <Stack.Screen name="login" 
        component={login} />
        

        <Stack.Screen name="listaUsuarios" 
        component={listaUsuarios} />
      
      </Stack.Navigator>
      
     


    </NavigationContainer>

);
}
