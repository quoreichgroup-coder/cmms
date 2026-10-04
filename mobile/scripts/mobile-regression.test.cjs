const assert=require('node:assert/strict'),{test}=require('node:test'),{mobileRuntime}=require('./mobile-test-runtime.cjs');
const response=(status,body)=>new Response(status===204?null:JSON.stringify(body),{status});
test('image and document upload metadata always has a usable MIME type and filename',()=>{
 const {createImageUploadFile,createUploadFile}=mobileRuntime().load('utils/uploadFiles.ts');
 assert.deepEqual({...createImageUploadFile({uri:'file:///cache/photo',mimeType:'image/heic'},1)},{uri:'file:///cache/photo',name:'image-1.jpg',type:'image/heic'});
 assert.deepEqual({...createImageUploadFile({uri:'file:///cache/photo.jpg'},2)},{uri:'file:///cache/photo.jpg',name:'photo.jpg',type:'image/jpeg'});
 assert.deepEqual({...createUploadFile({uri:'file:///cache/report%20final.pdf',mimeType:'application/pdf'})},{uri:'file:///cache/report%20final.pdf',name:'report final.pdf',type:'application/pdf'});
});
test('iOS photo picker uses compatible assets without requesting broad library access',()=>{
 const {shouldRequestPhotoLibraryPermission,getImageLibraryOptions}=mobileRuntime().load('utils/mediaPickerPlatform.ts');
 assert.equal(shouldRequestPhotoLibraryPermission('ios'),false);assert.equal(shouldRequestPhotoLibraryPermission('android'),true);
 assert.equal(getImageLibraryOptions('ios',{quality:.5}).preferredAssetRepresentationMode,'compatible');
 assert.deepEqual(getImageLibraryOptions('android',{quality:.5}),{quality:.5});
});
test('server URL accepts host or API path and rejects invalid configuration',async()=>{
 const {normalizeApiUrl,getApiUrl}=mobileRuntime({apiUrl:'https://server:3000'}).load('config.ts');
 assert.equal(await getApiUrl(),'https://server:3000/api/');assert.equal(normalizeApiUrl(' https://server/cmms/api/ '),'https://server/cmms/api/');
 for(const url of ['', 'server','ftp://server','https://user:password@server','https://server?key=x','https://server#x'])assert.throws(()=>normalizeApiUrl(url));assert.throws(()=>normalizeApiUrl('http://cmms.example.com/api'),/HTTPS/);
});
test('notification taps map only valid resource payloads to detail screens',()=>{
 const {getNotificationUrlFromData}=mobileRuntime().load('utils/urlPaths.ts');
 const workOrder=getNotificationUrlFromData({type:'WORK_ORDER',id:42});assert.equal(workOrder.route,'WODetails');assert.equal(workOrder.params.id,42);
 const request=getNotificationUrlFromData({type:'REQUEST',id:'7'});assert.equal(request.route,'RequestDetails');assert.equal(request.params.id,7);
 for(const data of [null,{}, {type:'UNKNOWN',id:1},{type:'INFO',id:1},{type:'ASSET',id:0},{type:'ASSET',id:true},{type:'ASSET',id:''},{type:'ASSET',id:'not-an-id'},{type:'ASSET',id:Number.MAX_SAFE_INTEGER+1}]) assert.equal(getNotificationUrlFromData(data),null);
});
test('preferred language tolerates missing company preferences during sign-in',()=>{
 const {getPreferredLanguage}=mobileRuntime().load('utils/preferredLanguage.ts');
 assert.equal(getPreferredLanguage('fr','en'),'fr');
 assert.equal(getPreferredLanguage('  ','FR'),'fr');
 assert.equal(getPreferredLanguage(null,null),'en');
});
test('writes preserve payload without stale company injection; DELETE 204 succeeds',async()=>{
 const api=mobileRuntime({initialStorage:{accessToken:'access',companyId:'999'},fetch:async(_,o)=>{
 assert.equal(o.headers.get('Authorization'),'Bearer access');assert.equal(o.headers.get('X-Platform'),'android');
 if(o.method==='DELETE')return response(204);assert.deepEqual(JSON.parse(o.body),{name:'Workshop'});return response(200,{id:2});
 }}).load('utils/api.ts').default;
 await api.post('locations',{name:'Workshop'});await api.patch('locations/2',{name:'Workshop'});assert.equal(await api.deletes('locations/2'),undefined);
});
test('multipart upload lets fetch generate the boundary',async()=>{
 const api=mobileRuntime({fetch:async(_,o)=>{assert.equal(o.headers.has('Content-Type'),false);assert.ok(o.body instanceof FormData);return response(200,[]);}}).load('utils/api.ts').default;
 const form=new FormData();form.append('type','OTHER');await api.post('files/upload',form,{},true,true);
});
test('simultaneous 401s share a refresh and retry with fresh bearer',async()=>{
 let refreshes=0,reads=0;const r=mobileRuntime({initialStorage:{accessToken:'old',refreshToken:'refresh'},fetch:async(url,o)=>{
 if(url.endsWith('auth/refresh')){refreshes++;await new Promise(resolve=>setTimeout(resolve,5));return response(200,{accessToken:'new',refreshToken:'rotated'});}
 reads++;return o.headers.get('Authorization')==='Bearer new'?response(200,[]):response(401,{});
 }});const api=r.load('utils/api.ts').default;
 await Promise.all([api.get('locations'),api.get('assets',{headers:{Authorization:'Bearer old'}})]);assert.equal(refreshes,1);assert.equal(reads,4);assert.equal(r.values.get('refreshToken'),'rotated');
});
for(const succeeds of [false,true])test(`persistent 401 is bounded; refresh success=${succeeds}`,async()=>{
 let refreshes=0,reads=0;const r=mobileRuntime({initialStorage:{accessToken:'old',refreshToken:'refresh'},fetch:async url=>{
 if(url.endsWith('auth/refresh')){refreshes++;return response(succeeds?200:401,succeeds?{accessToken:'new'}:{});}reads++;return response(401,{});
 }});await assert.rejects(r.load('utils/api.ts').default.get('locations'),e=>e.status===401);assert.equal(refreshes,1);assert.equal(reads,succeeds?2:1);if(!succeeds)assert.equal(r.values.has('accessToken'),false);
});
test('login sends no old bearer and wrong password does not refresh',async()=>{
 let requests=0;const api=mobileRuntime({initialStorage:{accessToken:'old',refreshToken:'refresh'},fetch:async(url,o)=>{requests++;assert.ok(url.endsWith('auth/signin'));assert.equal(o.headers.has('Authorization'),false);return response(401,{});}}).load('utils/api.ts').default;
 await assert.rejects(api.post('auth/signin',{email:'user',password:'wrong'}));assert.equal(requests,1);
});
test('pending requests time out and caller cancellation remains silent',async()=>{
 const r=mobileRuntime({timers:{setTimeout:callback=>setTimeout(callback,5)},fetch:(_,o)=>new Promise((_,reject)=>{
 const fail=()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}));if(o.signal.aborted)fail();else o.signal.addEventListener('abort',fail);
 })});const api=r.load('utils/api.ts').default;await assert.rejects(api.get('locations'),/serveur ne répond pas/);const controller=new AbortController();controller.abort();await assert.rejects(api.get('assets',{signal:controller.signal}),e=>e.name==='AbortError');
});
test('HTTP errors reach the global UI error handler',async()=>{
 const module=mobileRuntime({fetch:async()=>response(403,{message:'Access denied'})}).load('utils/api.ts');let message;
 const cleanup=module.setApiErrorHandler(e=>message=module.getErrorMessage(e));await assert.rejects(module.default.get('locations'));assert.equal(message,'Access denied');cleanup();
});
for(const name of ['workOrder','asset','part','request','user']){
 const module=mobileRuntime({apiMock:{get:async()=>{throw new Error('Server unavailable');},post:async()=>{throw new Error('Server unavailable');}}}).load(`slices/analytics/${name}.ts`);
 for(const operation of Object.keys(module).filter(k=>k.startsWith('get')))test(`analytics ${name}.${operation} stops loading on failure and resets on logout`,async()=>{
 let state=module.reducer(undefined,{type:'@@init'});await module[operation](name==='user'?1:false)(action=>state=module.reducer(state,action));
 assert.ok(Object.values(state.loading).every(v=>v===false));assert.ok(Object.values(state.errors).includes('Server unavailable'));state=module.reducer(state,{type:'REVERT_ALL'});assert.deepEqual(Object.keys(state.errors),[]);
 });
}
for(const [name,operation] of [['location','getLocationDetails'],['asset','getAssetDetails'],['workOrder','getWorkOrderDetails'],['preventiveMaintenance','getSinglePreventiveMaintenance']])test(`detail ${name} stops loading on rejection`,async()=>{
 const module=mobileRuntime({apiMock:{get:async()=>{throw new Error('Missing');}}}).load(`slices/${name}.ts`);let state=module.reducer(undefined,{type:'@@init'});
 await assert.rejects(module[operation](404)(action=>state=module.reducer(state,action)));assert.equal(state.loadingGet,false);
});
test('license activation contract and reset of entitlements',async()=>{
 const module=mobileRuntime({apiMock:{post:async(url,body)=>{assert.equal(url,'license/activate');assert.equal(body.licenseKey,'test-license-key');return {valid:true,entitlements:['NFC_BARCODE']};}}}).load('slices/license.ts');let state=module.reducer(undefined,{type:'@@init'});
 await module.activateLicense('test-license-key')(action=>state=module.reducer(state,action));assert.equal(state.state.valid,true);state=module.reducer(state,{type:'REVERT_ALL'});assert.equal(state.state.valid,false);
});
