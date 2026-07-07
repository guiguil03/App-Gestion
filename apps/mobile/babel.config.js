module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // class-properties doit être déclaré après decorators (mode legacy) :
    // sinon les champs optionnels des modèles WatermelonDB (`?` non requis)
    // plantent à l'instanciation avec "Decorating class property failed".
    // private-methods et private-property-in-object doivent être ajoutés
    // avec le même réglage `loose` que class-properties (Babel exige que ces
    // 3 plugins de "class features" partagent le même mode loose/spec) —
    // sans eux, on perd le support des méthodes privées (#foo) que le preset
    // Expo gérait avant qu'on ajoute explicitement class-properties.
    plugins: [
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-private-methods', { loose: true }],
      ['@babel/plugin-transform-private-property-in-object', { loose: true }],
    ],
  };
};
