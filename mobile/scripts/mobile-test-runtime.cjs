const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function mobileRuntime({fetch=global.fetch,apiUrl='http://localhost:3000/api',initialStorage={},apiMock,timers={}}={}){
 const values=new Map(Object.entries(initialStorage)),cache=new Map();
 const storage={async getItem(k){return values.get(k)??null;},async setItem(k,v){values.set(k,v);},async removeItem(k){values.delete(k);}};
 function load(relative){const file=path.resolve(root,relative);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 vm.runInNewContext(compiled,{exports,process: { env: {} },fetch,Headers,FormData,URL,AbortController,setTimeout,clearTimeout,console,...timers,require(id){
 if(id==='@react-native-async-storage/async-storage')return {__esModule:true,default:storage};
 if(id==='expo-constants')return {__esModule:true,default:{expoConfig:{extra:{API_URL:apiUrl}}}};
 if(id==='react-native-url-polyfill')return {URL};if(id==='react-native')return {Platform:{OS:'android'}};
 if(apiMock&&id.endsWith('/utils/api'))return {__esModule:true,default:apiMock,getErrorMessage:e=>e.message};
 if(id.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(file),id+'.ts')));return require(id);
 }},{filename:file});return exports;}
 return {load,storage,values};
}
module.exports={mobileRuntime};
