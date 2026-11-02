import { m } from "$parent/src/lib/paraglide/messages";
import type { WeedsColumn } from "../whoWhatTypes";

// Keyed by the English label the host's /api/weeds sends: a column key like `parent` reads differently per table.
// A label missing here is drawn as sent.
const LABELS: Record<string, () => string> = {
	Project: m.ww_rating_column_project,
	Platform: m.ww_rating_column_platform,
	Score: m.ww_rating_column_score,
	"Points scored": m.ww_rating_column_points_scored,
	"Points available": m.ww_rating_column_points_available,
	"Trees planted": m.ww_rating_column_trees_planted,
	"Scored on": m.ww_rating_column_scored_on,
	"Linked through": m.ww_rating_column_linked_through,
	"Listing id": m.ww_rating_column_listing_id,
	Started: m.ww_rating_column_started,
	Ends: m.ww_rating_column_ends,
	Description: m.ww_rating_column_description,
	Added: m.ww_rating_column_added,
	Crop: m.ww_rating_column_crop,
	Species: m.ww_rating_column_species,
	"Seed source": m.ww_rating_column_seed_source,
	"Nursery stock": m.ww_rating_column_nursery_stock,
	"Trees planned": m.ww_rating_column_trees_planned,
	Units: m.ww_rating_column_units,
	Unit: m.ww_rating_column_unit,
	"Price per unit": m.ww_rating_column_price_per_unit,
	Currency: m.ww_rating_column_currency,
	"Price in USD": m.ww_rating_column_price_in_usd,
	"Planted on": m.ww_rating_column_planted_on,
	"Belongs to": m.ww_rating_column_belongs_to,
	Site: m.ww_rating_column_site,
	Hectares: m.ww_rating_column_hectares,
	Latitude: m.ww_rating_column_latitude,
	Longitude: m.ww_rating_column_longitude,
	Status: m.ww_rating_column_status,
	"Surviving (%)": m.ww_rating_column_surviving_pct,
	"Price per tree": m.ww_rating_column_price_per_tree,
	"People employed": m.ww_rating_column_people_employed,
	"Counted as": m.ww_rating_column_counted_as,
	"Restoration type": m.ww_rating_column_restoration_type,
	Treatment: m.ww_rating_column_treatment,
	"Degraded on": m.ww_rating_column_degraded_on,
	Reviews: m.ww_rating_column_reviews,
	Organization: m.ww_rating_column_organization,
	Role: m.ww_rating_column_role,
	On: m.ww_rating_column_on,
	URL: m.ww_rating_column_url,
	Kind: m.ww_rating_column_kind,
	"Published by": m.ww_rating_column_published_by,
	Credit: m.ww_rating_column_credit,
	Order: m.ww_rating_column_order,
	Backs: m.ww_rating_column_backs,
};

/** The header a reader sees for a weeds column. */
export function columnLabel(column: WeedsColumn): string {
	return Object.hasOwn(LABELS, column.label) ? LABELS[column.label]() : column.label;
}
