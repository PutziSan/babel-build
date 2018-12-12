/* eslint-disable import/no-extraneous-dependencies */

const transformReactJsx = require('@babel/plugin-transform-react-jsx').default;

module.exports = api => {
  api.cache(() => process.env.NODE_ENV);

  const isDev = process.env.NODE_ENV === "development";
  const isTest = process.env.NODE_ENV === "test";
  const isProd = process.env.NODE_ENV === "production";

  return {
    plugins: [
      [transformReactJsx, { pragma: "h" }], // do not set pragme cause moduleResolver sets React to the preact-package
    ].filter(Boolean)
  };
};
