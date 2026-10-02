# SocioPatterns Infectious Dataset

Place the `out.sociopatterns-infectious` dataset file in this directory.

## Download

The dataset can be obtained from:
- **KONECT**: http://konect.cc/networks/sociopatterns-infectious/
- **SocioPatterns**: http://www.sociopatterns.org/datasets/infectious-sociopatterns/

## Format

The file contains contact events from the "INFECTIOUS: STAY AWAY" exhibition
at the Science Gallery in Dublin (2009).

Each data line contains: `node1  node2  weight  timestamp`

Lines beginning with `%` are metadata and will be skipped by the parser.

## Statistics
- ~17,298 raw contact events
- 410 unique individuals
- 2,765 unique contact edges
- ~7.9 hours of observation

## Fallback

If this file is not present, the application will generate synthetic
contact-network data matching the real dataset's statistics for
demonstration purposes.
