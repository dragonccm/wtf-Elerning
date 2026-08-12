"use client";
import { UploadCloud } from "lucide-react";
import { useState } from "react";

export function LocalUploadField({name,label,accept}:{name:string;label:string;accept:string}){
  const[url,setUrl]=useState(""); const[message,setMessage]=useState(""); const[pending,setPending]=useState(false);
  async function upload(file:File){setPending(true);setMessage("");const body=new FormData();body.set("file",file);try{const res=await fetch("/api/uploads",{method:"POST",body});const data=await res.json();if(!res.ok)throw new Error(data.error||"Upload thất bại");setUrl(data.url);setMessage(`Đã tải lên ${data.name}`)}catch(error){setMessage(error instanceof Error?error.message:"Upload thất bại")}finally{setPending(false)}}
  return <label className="flex cursor-pointer flex-col rounded-xl border border-dashed border-[var(--md-outline)] p-3 text-sm"><span className="flex items-center gap-2 font-bold"><UploadCloud className="size-4"/>{pending?"Đang tải…":label}</span><input type="file" accept={accept} className="sr-only" disabled={pending} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file)}}/><input type="hidden" name={name} value={url}/>{message&&<span className="mt-1 text-xs text-[var(--md-on-surface-variant)]">{message}</span>}</label>
}
