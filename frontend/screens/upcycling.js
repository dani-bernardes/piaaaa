
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Upcycling() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Upcycling</Text>
      <Text>Transforme peças antigas em novas possibilidades!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#6C4AB6",
    marginBottom: 10,
  },
});
