// declaring module will allow typescript to import the module
declare module 'svg-path-generator' {
    // typing module default export as `any` will allow you to access its members without compiler warning
    var svgPathGenerator: any; 
    export default svgPathGenerator;
  }