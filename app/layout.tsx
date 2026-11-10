import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'留白 Blank Studio｜把時間留給美好',description:'工作室預約、月曆管理與 Instagram 空檔圖，一處完成。',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body>{children}</body></html>}
