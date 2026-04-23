FROM node:20-alpine

# Install PostgreSQL client for database import
RUN apk add --no-cache postgresql-client

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the Sythe extension zip for dashboard download
RUN node -e " \
const fs=require('fs'),path=require('path'),zlib=require('zlib'); \
const folder='/app/sythe-extension'; \
if(!fs.existsSync(folder)){process.exit(0);} \
const files=fs.readdirSync(folder).map(f=>({name:'sythe-extension/'+f,data:fs.readFileSync(path.join(folder,f))})); \
const bufs=[],cd=[]; let off=0; \
function u16(n){const b=Buffer.alloc(2);b.writeUInt16LE(n);return b;} \
function u32(n){const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;} \
function crc32(buf){let c=0xFFFFFFFF,t=[];for(let i=0;i<256;i++){let x=i;for(let j=0;j<8;j++)x=(x&1)?(0xEDB88320^(x>>>1)):(x>>>1);t[i]=x;}for(let i=0;i<buf.length;i++)c=t[(c^buf[i])&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0;} \
const d=new Date(),dt=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),dd=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate(); \
for(const f of files){const nb=Buffer.from(f.name),cp=zlib.deflateRawSync(f.data),cr=crc32(f.data); \
const lh=Buffer.concat([Buffer.from([0x50,0x4B,0x03,0x04]),u16(20),u16(0),u16(8),u16(dt),u16(dd),u32(cr),u32(cp.length),u32(f.data.length),u16(nb.length),u16(0),nb]); \
cd.push({nb,cr,cs:cp.length,us:f.data.length,off,dt,dd});bufs.push(lh,cp);off+=lh.length+cp.length;} \
const cs=off; \
for(const e of cd){const ch=Buffer.concat([Buffer.from([0x50,0x4B,0x01,0x02]),u16(20),u16(20),u16(0),u16(8),u16(e.dt),u16(e.dd),u32(e.cr),u32(e.cs),u32(e.us),u16(e.nb.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(e.off),e.nb]);bufs.push(ch);off+=ch.length;} \
const er=Buffer.concat([Buffer.from([0x50,0x4B,0x05,0x06]),u16(0),u16(0),u16(cd.length),u16(cd.length),u32(off-cs),u32(cs),u16(0)]);bufs.push(er); \
fs.mkdirSync('/app/client/public',{recursive:true}); \
fs.writeFileSync('/app/client/public/sythe-extension.zip',Buffer.concat(bufs)); \
console.log('Sythe extension zip built successfully'); \
"

RUN npm run build

RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
