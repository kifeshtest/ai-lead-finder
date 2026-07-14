/**
 * Genereert concrete, meetbare gesprekspunten + een positieve observatie + openingszin.
 * Alle claims zijn gebaseerd op echte gemeten gegevens (nooit verzonnen).
 */
export function generateTalkingPoints(lead, pagespeed, checks) {
  const points = [];
  const ps = pagespeed && pagespeed.ok !== false ? pagespeed : null;
  const c = checks || {};

  if (!lead.hasWebsite) {
    points.push('Het bedrijf heeft geen vindbare website — een professionele site vergroot direct de vindbaarheid en het vertrouwen.');
    if (lead.phone) points.push('Er is een telefoonnummer bekend, dus het bedrijf is goed te benaderen.');
    return {
      talkingPoints: points,
      positiveNote: 'Het bedrijf is actief en vindbaar in openbare bedrijfsdata.',
      openingLine:
        `Ik zag dat ${lead.companyName} nog geen eigen website heeft. Daar valt online veel te winnen qua vindbaarheid en nieuwe klanten — daar help ik ondernemers graag bij.`,
    };
  }

  if (ps) {
    if (ps.performance != null) {
      if (ps.performance < 50) points.push(`De mobiele performance-score is ${ps.performance}/100, waardoor bezoekers lang moeten wachten en afhaken.`);
      else if (ps.performance < 90) points.push(`De mobiele snelheid scoort ${ps.performance}/100 — sneller laden houdt meer bezoekers vast.`);
    }
    if (ps.seo != null && ps.seo < 90) points.push(`De SEO-score is ${ps.seo}/100, waardoor het bedrijf mogelijk minder goed wordt gevonden in Google.`);
    if (ps.lcpMs != null && ps.lcpMs > 2500) points.push(`De grootste inhoud laadt pas na ${(ps.lcpMs / 1000).toFixed(1)} seconden op mobiel (traag).`);
  }

  if (c.https === false) points.push('De website gebruikt geen geldige beveiligde HTTPS-verbinding.');
  if (c.mobileViewport === false || c.notResponsive) points.push('De website is op mobiele schermen lastig te gebruiken (niet responsive).');
  if (c.footerYearStale) points.push(`De footer/copyright staat nog op ${c.copyrightYear} — de site oogt verouderd.`);
  if (c.oldJquery || c.flash) points.push('De site gebruikt sterk verouderde techniek.');
  if (c.hasCTA === false) points.push('Er ontbreekt een duidelijke knop om een offerte of afspraak aan te vragen.');
  if (c.hasContactForm === false) points.push('Er is geen contactformulier; contact opnemen is daardoor drempelverhogend.');
  if (c.metaDescription === false) points.push('De website heeft geen meta description, wat de vindbaarheid in Google beperkt.');
  if (c.oneClearH1 === false) points.push('De pagina mist één duidelijke hoofdkop (H1), wat SEO en structuur schaadt.');
  if (typeof c.imagesMissingAlt === 'number' && c.imagesMissingAlt >= 3) points.push(`${c.imagesMissingAlt} afbeeldingen missen alt-tekst (slecht voor SEO en toegankelijkheid).`);
  if (c.sitemapXml === false) points.push('De website heeft geen sitemap.xml, wat zoekmachines kan beperken.');
  if (c.mixedContent) points.push('De site laadt onveilige (http) onderdelen op een beveiligde pagina.');

  // Positieve observatie zodat het gesprek niet alleen negatief begint
  let positiveNote;
  if (ps && ps.performance != null && ps.performance >= 70) positiveNote = 'De basis-laadsnelheid is redelijk op orde — een goed fundament om op te bouwen.';
  else if (c.https) positiveNote = 'Er is in elk geval een beveiligde HTTPS-verbinding aanwezig.';
  else if (lead.phone) positiveNote = 'Het bedrijf is telefonisch goed bereikbaar.';
  else positiveNote = 'Het bedrijf is actief en heeft een bestaande online aanwezigheid om op voort te bouwen.';

  // Openingszin op basis van de twee belangrijkste punten
  const top = points.slice(0, 2).map((p) => p.replace(/\.$/, '').replace(/^De |^Er /, (m) => m.toLowerCase()));
  const openingLine = top.length
    ? `Tijdens een korte controle van jullie website zag ik dat ${top.join(' en dat ')}. Daar liggen waarschijnlijk kansen om meer aanvragen uit de website te halen.`
    : 'Tijdens een korte controle van jullie website zag ik een paar concrete kansen om meer bezoekers om te zetten in aanvragen.';

  return { talkingPoints: points.slice(0, 7), positiveNote, openingLine };
}
