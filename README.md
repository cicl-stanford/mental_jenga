# Mental Jenga

## Summary

People make causal judgments about the physical world in everyday life. Might mental simulation be critical in our ability to make these judgments?

## Repository structure

```
├── code
│   ├── experiments
│   ├── js
│   └── R
├── data
├── figures
└── docs
```

`code/` includes all the code used in running experiments, model implementation, and data analysis.

* `code/experiments` includes psiTurk code for each of the experiments described in the paper
* `code/js` includes javascript code used to implement the model and run simulations
* `code/R` includes R code for analysis of data and simulations (you can also see the analysis [here](https://cicl-stanford.github.io/mental_jenga/analysis/))

`data` contains all (anonymized) data gathered, in addition to files containing the data for every trial used in the experiments.

* `data/expX` directories contain JSON files for the stimuli for each of the 3 experiments
* `exp3_key.json` contains the IDs of the black and white brick for each trial in experiment 3
* `raw/` contains anonymized data files for all experiments

## Interactive visualization

Check out the interactive visualization [here](https://cicl-stanford.github.io/mental_jenga/interface/)!