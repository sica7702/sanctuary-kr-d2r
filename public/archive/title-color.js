// Sample the OCR name line, not the upper 30% containing blue option text.
export function titleColor(pixels){
 const counts={magic:0,rare:0,crafted:0,normal:0,other:0};
 for(let i=0;i<pixels.length;i+=4){
  const r=pixels[i],g=pixels[i+1],b=pixels[i+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);
  if(pixels[i+3]<128||hi<100)continue;
  if(hi-lo<30)counts.normal++;
  else if(b>r*1.22&&b>g*1.12)counts.magic++;
  else if(r>150&&g>130&&b<Math.min(r,g)*.55&&g>r*.76)counts.rare++;
  else if(r>150&&g>65&&g<r*.73&&b<g*.7)counts.crafted++;
  else counts.other++;
 }
 const total=Object.values(counts).reduce((a,b)=>a+b,0),best=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
 return total>=25&&best[0]!=='other'&&best[1]/total>=.6?best[0]:null;
}
export function nameLineColor(canvas,lines){
 const first=lines.filter(l=>l.bbox&&String(l.text||'').trim()).sort((a,b)=>a.bbox.y0-b.bbox.y0)[0];
 if(!first||first.bbox.y0>canvas.height*.4||/방어력|내구도|요구|필요|피해|저항|시전|Defense|Required/i.test(first.text))return null;
 const {x0,y0,x1,y1}=first.bbox;
 // Right-hand skin icons and bracketed range hints must not vote on rarity.
 const x=Math.max(0,Math.floor(x0)),y=Math.max(0,Math.floor(y0));
 const w=Math.min(canvas.width-x,Math.max(1,Math.floor((x1-x0)*.6)));
 const h=Math.min(canvas.height-y,Math.max(1,Math.ceil(y1-y0)));
 if(w<5||h<3)return null;
 return titleColor(canvas.getContext('2d').getImageData(x,y,w,h).data);
}
