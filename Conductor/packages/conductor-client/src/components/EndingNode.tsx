import React, { useMemo } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import './Node.css';

const cps = 22;
const wrap = (txt: string) => {
  if (!txt) return [' '];
  const out: string[] = [];
  txt.split(/\r?\n/).forEach(line => {
    let cur='';
    line.split(' ').forEach(w=>{
      if((cur+(cur?' ':'')+w).length<=cps) cur+=(cur?' ':'')+w;
      else { if(cur) out.push(cur); cur=w.length>cps? w.slice(0,cps-1)+'…':w; }
    });
    if(cur) out.push(cur);
  });
  return out;
};
const calcH=(l:number)=>60+l*14;

const EndingNode=({data,isConnectable}:{data:any,isConnectable:boolean})=>{
  const {label,description='',isCurrent}=data;
  const lines=useMemo(()=>wrap(description),[description]);
  const height=calcH(lines.length);
  return (
    <div className={`canvas-node ending-node ${isCurrent?'current':''}`} style={{width:150,borderRadius:10,background:'#1a1a2e',border:isCurrent?'3px dashed #fff':'2px solid #8b5cf6',boxShadow:isCurrent?'0 0 0 6px rgba(255,255,255,0.2)':'0 2px 8px rgba(0,0,0,0.3)'}}>
      <div style={{background:'#1f2937',padding:'8px 10px',borderRadius:'4px 4px 0 0'}}>
        <span style={{fontWeight:'bold',color:'#fff',fontSize:12,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',display:'block'}}>{label}</span>
      </div>
      <div style={{padding:'10px',color:'#cbd5e1',fontSize:10,lineHeight:'14px',whiteSpace:'pre-line'}}>{lines.join('\n')}</div>

      <Handle type="target" position={Position.Left} style={{background:'#10b981',border:'2px solid #1a1a2e',width:16,height:16,left:-8,top:'50%',transform:'translateY(-50%)'}} isConnectable={isConnectable}/>
    </div>
  );
};
export default EndingNode;
