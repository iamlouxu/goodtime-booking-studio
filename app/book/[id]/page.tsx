import Studio from '../../studio';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Studio shopId={id} signedIn={false}/>}
