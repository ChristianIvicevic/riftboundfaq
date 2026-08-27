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
| [
    $gallery.cards.items[]
    | select(
        .rarity.value.id != "showcase"
          and .collectorNumber <= $setMaximums[.set.value.id]
          and (.publicCode | test("[0-9]+a/|\\*/|-SP[0-9]+/") | not)
          and all(.cardType.type[]?; .id != "rune")
      )
  ]
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
