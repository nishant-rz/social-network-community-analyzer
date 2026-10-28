# Human DNA Repair Protein Network (Demo)

## Dataset purpose

This is a small, review-friendly teaching network for uploading to the Social Network Analyzer dashboard. It uses real human protein/gene symbols and a selected set of reported protein associations connected with homologous recombination and DNA double-strand-break response.

The edge list is assembled as a compact demonstration subset from BioGRID interaction records. It is not a complete interactome and is not a bulk BioGRID export. In BioGRID, evidence types differ: some records support a physical association or co-purification, while some may represent proteins recovered in the same complex. Therefore, an edge means “reported association in the cited records,” not necessarily direct atom-to-atom binding in every case.

## CSV fields

- `source`, `target`: the two protein nodes. The dashboard treats each edge as undirected.
- `weight`: set to `1` on every row to make this a simple, unweighted graph. It is a formatting value for the dashboard, not a biological confidence score, binding affinity, or interaction strength.

The CSV has 9 distinct proteins and 8 edges. It is intentionally small enough to inspect in a class demonstration. The BRCA1/PALB2/BRCA2/RAD51 side and the MRE11A/RAD50/NBN side are linked through reported BRCA1–MRE11A association, so the graph demonstrates paths and community detection without claiming that Louvain's clusters are definitive biological complexes.

## Interaction evidence sources

The pairs below have BioGRID interaction records. The record pages list the experimental evidence and, where available, the supporting publication.

- `BRCA1,BARD1` — BioGRID interaction summary: https://thebiogrid.org/interaction/1055780
- `BRCA1,PALB2` — BioGRID interaction summary: https://thebiogrid.org/interaction/672053/palb2-brca1.html. The cited research reports direct binding of PALB2 to BRCA1 and its role in connecting BRCA1 and BRCA2.
- `PALB2,BRCA2` — BioGRID interaction summary: https://thebiogrid.org/interaction/545230. The page includes affinity-capture mass spectrometry evidence and the paper “PALB2 is an integral component of the BRCA complex required for homologous recombination repair.”
- `BRCA2,RAD51` — BioGRID interaction summary: https://thebiogrid.org/interaction/2524450/brca2-rad51.html
- `BRCA1,BRIP1` — BioGRID interaction summary: https://thebiogrid.org/interaction/3490340/brca1-brip1.html. The page lists multiple evidence types, including affinity capture and a co-crystal structure record.
- `BRCA1,MRE11A` — BioGRID interaction summary: https://thebiogrid.org/interaction/590686. The page includes affinity-capture, co-purification and reconstituted-complex evidence and cites work on BRCA1/BARD1-containing complexes with MRE11/RAD50/NBS1.
- `MRE11A,RAD50` — BioGRID interaction summary: https://thebiogrid.org/interaction/142416
- `RAD50,NBN` — BioGRID interaction summary: https://thebiogrid.org/interaction/657596. The page lists affinity-capture, co-fractionation and co-purification evidence.

BioGRID is a curated interaction repository and provides downloads under its stated MIT license. Dataset and repository information: https://downloads.thebiogrid.org/BioGRID/Latest-Release/ .

## How to use it

1. Open the dashboard's **Communities** tab.
2. Choose **Load edge list**.
3. Select `human-dna-repair-protein-network.csv`.
4. Explore the community colours and select a node such as `BRCA1` or `RAD51`.
5. In **Relationships**, select two protein labels to inspect a direct edge or a path through the network.

## Suggested explanation in a review

“I used a small subset of reported human DNA-repair protein associations as a graph: proteins are vertices and reported associations are edges. The equal weight of 1 means I am demonstrating an unweighted graph; it does not represent experimental confidence. Louvain groups nodes by graph structure and modularity, so its output is a mathematical partition of this subset, not a claim that the detected groups are experimentally validated complexes.”

## Dashboard wording

The dashboard was designed for social networks, so some labels say “people” or “friendships.” For this demonstration, read those as “proteins” and “reported associations.” No biology-specific meaning is inferred from those interface labels.
