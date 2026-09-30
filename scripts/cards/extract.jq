def rune_name:
  {
    body: "Body",
    calm: "Calm",
    chaos: "Chaos",
    fury: "Fury",
    mind: "Mind",
    order: "Order",
    rainbow: "Universal"
  }[.];

def readable_text:
  if . == null then
    null
  else
    gsub(":rb_energy_(?<value>[0-9]+):"; "[\(.value)]")
    | gsub(":rb_rune_(?<value>[a-z]+):"; "[\(.value | rune_name)]")
    | gsub(":rb_exhaust:"; "[Exhaust]")
    | gsub(":rb_might:"; "[Might]")
    | gsub("&gt;"; ">")
    | gsub("&quot;"; "\"")
    | gsub("<br\\s*/?>"; "\n")
    | gsub("<li>"; "- ")
    | gsub("</li>|</p>"; "\n")
    | gsub("</?p>|</?ul>"; "")
    | gsub("[ \\t]+\n"; "\n")
    | gsub("\n[ \\t]+"; "\n")
    | gsub("\n{3,}"; "\n\n")
    | gsub("^\\s+|\\s+$"; "")
  end;

def deduplicate_cards:
  reduce .[] as $card (
    { cards: [], cardsById: {} };
    if (.cardsById | has($card.id)) then
      if .cardsById[$card.id] == $card then
        .
      else
        error("Conflicting duplicate card ID: \($card.id)")
      end
    else
      .cards += [$card]
      | .cardsById[$card.id] = $card
    end
  )
  | .cards;

# Gallery metadata disagrees with the printed names in accessibility text for these cards.
def accessibility_name_override:
  {
    "ogs-004-024": "Yi, Meditative",
    "ogs-009-024": "Yi, Honed",
    "sfd-179-221": "Corina Veraza",
    "ven-060-166": "Sky Cruiser",
    "ven-t04": "Recruit (NX)"
  }[.id];

def normalized_words:
  gsub("<[^>]*>"; " ")
  | gsub(":rb_[^:]+:"; " ")
  | gsub("\\[[^]]*\\]"; " ")
  | ascii_downcase
  | [ scan("[a-z]+") ];

def accessibility_suffix($description; $candidate):
  if $description | startswith("\($candidate).") then
    $description[(($candidate | length) + 1):]
  elif $description | startswith("\($candidate) .") then
    $description[(($candidate | length) + 2):]
  else
    null
  end;

def accessibility_name:
  . as $card
  | (.cardImage.accessibilityText // "") as $text
  | ($text | index(": ")) as $separator
  | (
      if $separator == null then
        error("Expected card accessibility text with a name: \($card.id)")
      else
        $text[($separator + 2):]
      end
    ) as $description
  | (($card.text.richText.body // $card.effect.richText.body // "") | normalized_words)[0:3] as $rulesPrefix
  | [
      $card.name,
      if $card.subtitle == null then empty else "\($card.name), \($card.subtitle)" end,
      if $card.subtitle == null then empty else "\($card.name) - \($card.subtitle)" end,
      ($card | accessibility_name_override)
    ]
  | map(select(. != null))
  | unique
  | map(
      . as $candidate
      | select(
          (accessibility_suffix($description; $candidate)) as $suffix
          | $suffix != null and (($suffix | normalized_words)[0:3] == $rulesPrefix)
        )
    )
  | if length == 1 then
      .[0]
    elif length == 0 then
      error("Could not match card accessibility name: \($card.id)")
    else
      error("Ambiguous card accessibility name: \($card.id)")
    end;

(
  .props.pageProps.page.blades
  | map(select(.type == "riftboundCardGallery"))
  | if length == 1 and (.[0].cards.items | type) == "array" then
      .[0]
    else
      error("Expected exactly one Riftbound card gallery with a cards.items array")
    end
)
| . as $gallery
| ($gallery.sets.items | map({ key: .id, value: .collectorNumberMax }) | from_entries) as $setMaximums
| ($gallery.sets.items | map(.id) | to_entries | map({ key: .value, value: .key }) | from_entries) as $setRanks
| ($gallery.cards.items | deduplicate_cards) as $cards
| [
    $cards[]
    | select(
        .rarity.value.id != "showcase"
          and .collectorNumber <= $setMaximums[.set.value.id]
          and (.publicCode | test("[0-9]+a/|\\*/|-SP[0-9]+/") | not)
          and all(.cardType.type[]?; .id != "rune")
      )
  ]
| map(.name = accessibility_name)
| group_by(.name)
| map(
    if length == 1 then
      .[0]
    elif all(.[]; any(.cardType.superType[]?; .id == "token")) then
      max_by($setRanks[.set.value.id])
    else
      error("Unexpected duplicate non-token card: \(.[0].name)")
    end
  )
| map({
    name,
    energyCost: (.energy.value.id // null),
    powerCost: (.power.value.id // null),
    might: (.might.value.id // null),
    domains: [ .domain.values[]?.label ],
    cardTypes: [ .cardType.type[]?.label ],
    superTypes: [ .cardType.superType[]?.label ],
    tags: (.tags.tags // []),
    abilities: ((.text.richText.body // null) | readable_text),
    effects: ((.effect.richText.body // null) | readable_text)
  })
| sort_by(.name)
