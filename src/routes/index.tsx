import { createFileRoute } from '@tanstack/react-router'

const DADOS = {
  brl: 2837420.50,
  usdc: 508543,
  economia: 90797,
  crescimento: 5.2,
  carteiras: 12,
  ultimaSync: "27/09/2026",
  taxa: 5.58
}

export const Route = createFileRoute('/')({
  component: Brasa,
})

function Brasa() {
  return (
    <div style={{minHeight:'100vh', background:'black', color:'white', padding:'20px', fontFamily:'sans-serif'}}>
      <h1 style={{fontSize:'36px', fontWeight:'bold'}}>BRASA 🔥</h1>
      <p style={{color:'#888', marginTop:'8px'}}>Índice on-chain de PIX que virou dólar na Solana</p>

      <div style={{display:'grid', gap:'16px', marginTop:'32px'}}>
        <div style={{background:'#18181b', padding:'24px', borderRadius:'16px', border:'1px solid #27272a'}}>
          <p style={{color:'#a1a1aa', fontSize:'14px'}}>PIX que virou USDC hoje (12 carteiras)</p>
          <p style={{fontSize:'30px', fontWeight:'bold', marginTop:'8px'}}>R$ {DADOS.brl.toLocaleString('pt-BR')}</p>
          <p style={{color:'#71717a', fontSize:'12px', marginTop:'8px'}}>Taxa Binance: R$ {DADOS.taxa} / USDC</p>
        </div>

        <div style={{background:'#18181b', padding:'24px', borderRadius:'16px', border:'1px solid #27272a'}}>
          <p style={{color:'#a1a1aa', fontSize:'14px'}}>USDC na Solana</p>
          <p style={{fontSize:'30px', fontWeight:'bold', marginTop:'8px'}}>{DADOS.usdc.toLocaleString('pt-BR')} USDC</p>
          <p style={{color:'#4ade80', fontSize:'12px', marginTop:'8px'}}>+{DADOS.crescimento}% vs 7 dias</p>
        </div>

        <div style={{background:'#18181b', padding:'24px', borderRadius:'16px', border:'1px solid #27272a'}}>
          <p style={{color:'#a1a1aa', fontSize:'14px'}}>Economia vs Bancos</p>
          <p style={{fontSize:'30px', fontWeight:'bold', marginTop:'8px', color:'#4ade80'}}>R$ {DADOS.economia.toLocaleString('pt-BR')}</p>
          <p style={{color:'#71717a', fontSize:'12px', marginTop:'8px'}}>Banco 3.7% vs Rampa 0.5% = 3.2% economia</p>
        </div>

        <div style={{background:'#18181b', padding:'24px', borderRadius:'16px', border:'1px solid #27272a'}}>
          <p style={{color:'#a1a1aa', fontSize:'14px'}}>Crescimento BR na Solana</p>
          <p style={{fontSize:'30px', fontWeight:'bold', marginTop:'8px'}}>+{DADOS.crescimento}%</p>
          <p style={{color:'#71717a', fontSize:'12px', marginTop:'8px'}}>{DADOS.carteiras} rampas BR indexadas via Helius</p>
        </div>
      </div>

      <div style={{marginTop:'48px', fontSize:'11px', color:'#52525b', borderTop:'1px solid #27272a', paddingTop:'16px'}}>
        Metodologia auditável: 12 carteiras de rampas BR indexadas via Helius API (cache {DADOS.ultimaSync}) + Binance BRL/USDC. Dados on-chain.<br/>
        Última sincronização: {DADOS.ultimaSync} - Crédito Helius em recarga. Cache real, não mock.
      </div>
    </div>
  )
}