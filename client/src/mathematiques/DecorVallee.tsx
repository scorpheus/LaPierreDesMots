import type { ReactElement, ReactNode } from 'react';
import type { LieuMaths } from '@pierre/partage/mathematiques';
import { urlAsset } from '../api/client.js';

/** Décors de jeu vectoriels : leurs constructions restent liées aux étapes acquises. */
export function DecorVallee({ lieu, projetsTermines, children }: {
  readonly lieu: LieuMaths; readonly projetsTermines: number; readonly children?: ReactNode;
}): ReactElement {
  if (lieu === 'ponts') return <div className="scene-ponts__illustration" data-decor-maths={lieu}
    data-projets-acquis={projetsTermines}
    style={{ backgroundImage: `url(${urlAsset('assets/mathematiques/ponts-des-rives-v1.png')})` }}>
    {projetsTermines >= 2 && <span className="maths-chemin-messager" aria-label="Le chemin du messager est ouvert" />}
    {projetsTermines >= 3 && <span className="maths-rampe-secours" aria-label="La rampe de secours est réparée" />}
    {children}</div>;
  const couleurs = { jardin: '#d9ebaf', moulin: '#b8dfdb', marche: '#f9d6ad', chantier: '#e8d1ae', horloge: '#c5d7ee' };
  return <div className="scene-ponts__illustration decor-vallee" data-decor-maths={lieu} data-projets-acquis={projetsTermines}>
    <svg viewBox="0 0 900 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="900" height="300" fill={couleurs[lieu]} />
      <circle cx="735" cy="65" r="38" fill="#fff4cc" />
      <path d="M0 220Q150 100 340 205T700 180T900 170V300H0Z" fill="#80a875" />
      <path d="M0 280Q300 220 450 260T900 230V300H0Z" fill="#678d66" />
      {lieu === 'jardin' && <>
        {[0, 1, 2, 3].map((rang) => <g key={rang} transform={`translate(${180 + rang * 122} 210)`}>
          <path d="M0 0L70 -12L106 30L24 46Z" fill="#98704a" stroke="#664b32" strokeWidth="5" />
          {projetsTermines > 0 && <><path d="M45 8V-28" stroke="#316548" strokeWidth="7" />
            <ellipse cx="32" cy="-24" rx="18" ry="9" fill="#4b8751" transform="rotate(25 32 -24)" /><ellipse cx="59" cy="-32" rx="18" ry="9" fill="#579a51" transform="rotate(-25 59 -32)" /></>}
        </g>)}
        {projetsTermines >= 2 && <g transform="translate(680 206)" fill="#dba95f" stroke="#755435" strokeWidth="4">
          <path d="M0 0H76V42H0Z M0 14H76 M0 28H76 M15 0V42 M61 0V42" />
          {[15, 38, 61].map((x) => <circle key={x} cx={x} cy="-6" r="12" fill="#b86242" />)}
        </g>}
        {projetsTermines >= 3 && <path d="M290 170H530V190H290ZM315 190V230M510 190V230" fill="#f4d092" stroke="#765431" strokeWidth="8" />}
      </>}
      {lieu === 'moulin' && <>
        <path d="M390 250L407 75H540L563 250Z" fill="#eee0b8" stroke="#805c41" strokeWidth="7" />
        <path d="M380 80L475 18L568 80Z" fill="#bd7252" />
        <g transform="translate(475 115)" stroke="#694e35" strokeWidth="7" fill="#dcb773">
          {[0, 90, 180, 270].map((angle) => <path key={angle} d="M0 0L-15 -102H17L8 -10Z" transform={`rotate(${angle + (projetsTermines > 0 ? 30 : 0)})`} />)}
          <circle r="14" fill="#674731" />
        </g>
        {projetsTermines >= 2 && [0, 1, 2].map((n) => <path key={n} d="M0 0Q-25 45 0 50Q30 45 14 0Z" transform={`translate(${590 + 34 * n} 203)`} fill="#cfb782" stroke="#796747" strokeWidth="4" />)}
      </>}
      {lieu === 'marche' && [0, 1, 2].map((n) => <g key={n} transform={`translate(${135 + n * 205} 115)`}>
        <path d="M0 125V0H165V125M0 72H165" fill="none" stroke="#806040" strokeWidth="9" />
        <path d="M-12 0L15 -35H145L177 0Z" fill={projetsTermines > 0 ? ['#c86f58', '#e3b663', '#518987'][n] : '#bbba9e'} />
        {projetsTermines > 0 && [30, 65, 100, 130].map((x) => <circle key={x} cx={x} cy="61" r="13" fill={n === 1 ? '#e2b84c' : '#c97248'} />)}
        {projetsTermines >= 2 && n === 1 && <g stroke="#6c5540" strokeWidth="4" fill="#f6d57e">
          <path d="M83 40V8M54 18H112M54 18V35M112 18V35" fill="none" />
          <path d="M40 35Q54 53 68 35ZM98 35Q112 53 126 35Z" />
        </g>}
        {projetsTermines >= 3 && <circle cx="83" cy="25" r="12" fill="#fff4b6" />}
      </g>)}
      {lieu === 'chantier' && <>
        <path d="M210 245V140H370V245M200 140L290 85L380 140Z" fill="#d7c19b" stroke="#7f624c" strokeWidth="6" />
        {projetsTermines >= 1 && <path d="M215 140L290 98L365 140" fill="#c87656" />}
        {projetsTermines >= 2 && <path d="M480 250V100H580V250M468 100L530 48L592 100Z" fill="#d9b77f" stroke="#7a5941" strokeWidth="6" />}
        <path d="M620 255H730V220H690V185H650V220H620Z" fill="#b99870" stroke="#7b614a" strokeWidth="5" />
        {projetsTermines >= 3 && <path d="M205 145L290 81L380 145Z" fill="#7e8daa" />}
      </>}
      {lieu === 'horloge' && <>
        <path d="M395 260V58H510V260Z" fill="#e4cf9f" stroke="#8b7455" strokeWidth="7" />
        <path d="M377 61L452 12L529 61Z" fill="#99715b" />
        <circle cx="453" cy="114" r="41" fill="#fff4cd" stroke="#81654d" strokeWidth="7" />
        <path d={projetsTermines > 0 ? 'M453 79V114L475 128' : 'M453 85V139'} fill="none" stroke="#42596b" strokeWidth="7" strokeLinecap="round" />
        {projetsTermines >= 2 && <path d="M0 288Q240 230 450 272T900 255" fill="none" stroke="#f5de92" strokeWidth="12" />}
      </>}
      {projetsTermines >= 3 && <g><path d="M100 40Q450 140 800 40" stroke="#77624d" strokeWidth="3" fill="none" />
        {[200, 300, 400, 500, 600, 700].map((x, i) => <path key={x} d={`M${x} ${65 + Math.sin(i / 5 * Math.PI) * 24}l25 5l-12 30z`} fill={['#bc735e', '#e1b764', '#638f88'][i % 3]} />)}</g>}
    </svg>
    {children}
  </div>;
}
