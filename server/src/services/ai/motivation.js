import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';

let client = null;
let warned = false;

function template(lead) {
  const city = lead.city ? ` in ${lead.city}` : '';
  if (!lead.hasWebsite) {
    return `${lead.companyName}${city} heeft geen vindbare website. Een professionele site vergroot direct de online vindbaarheid en het vertrouwen — een sterke kans voor een nieuw webdesign.`;
  }
  return `De website van ${lead.companyName} scoort ${lead.websiteScore}/100 (${lead.reason?.toLowerCase() || 'meerdere verbeterpunten'}). Een moderne, snelle en mobielvriendelijke website levert naar verwachting meer aanvragen en conversies op.`;
}

/**
 * Genereert een korte Nederlandse motivatie waarom dit bedrijf een goede webdesign-lead is.
 * Gebruikt Anthropic Claude wanneer ENABLE_AI + ANTHROPIC_API_KEY gezet zijn; anders een template.
 */
export async function generateMotivation(lead) {
  if (!config.enableAI || !config.anthropicApiKey) return template(lead);

  try {
    if (!client) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      client = new Anthropic({ apiKey: config.anthropicApiKey });
    }
    const facts = {
      bedrijf: lead.companyName,
      branche: lead.branche,
      plaats: lead.city,
      heeft_website: lead.hasWebsite,
      website_score: lead.websiteScore,
      reden: lead.reason,
      signalen: lead.reasonTags,
    };
    const msg = await client.messages.create({
      model: config.aiModel,
      max_tokens: 160,
      system:
        'Je bent een sales-assistent voor een webdesignbureau. Schrijf één korte, overtuigende ' +
        'Nederlandse motivatie (maximaal 2 zinnen) waarom dit bedrijf een goede webdesign-lead is. ' +
        'Wees concreet en onderbouw met de gegeven signalen. Geen clichés, geen aanhef, alleen de motivatie.',
      messages: [{ role: 'user', content: JSON.stringify(facts) }],
    });
    const text = msg.content?.map((b) => b.text || '').join('').trim();
    return text || template(lead);
  } catch (err) {
    if (!warned) { logger.warn('AI-motivatie mislukt, val terug op template:', err.message); warned = true; }
    return template(lead);
  }
}
