import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator } from '@react-navigation/native-stack';

import Cadastro from '../screens/cadastro';
import telainicial from '../screens/telainicial';
import Login from '../screens/login';

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
        

       
      </Stack.Navigator>
      
     


    </NavigationContainer>

);
}
