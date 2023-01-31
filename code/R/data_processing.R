## Features

# for generating the features cache files from the output of javascript feature generation

# exp 1

df.exp1.features.scene = read_json("data/features/scene_exp1.json") %>%
  as.tbl_json %>%
  gather_object("trial") %>%
  gather_object("features") %>%
  append_values_number("index") %>%
  mutate(trial = str_replace_all(trial, "trial_", ""),
         trial = as.numeric(trial)) %>%
  select(-document.id) %>%
  arrange(trial) %>%
  as.data.frame() %>%
  select(-4) %>%
  pivot_wider(names_from = features, values_from = index)

df.exp1.features.black = read_json("data/features/black_exp1.json") %>%
  as.tbl_json %>%
  gather_object("trial") %>%
  gather_object("features") %>%
  append_values_number("index") %>%
  mutate(trial = str_replace_all(trial, "trial_", ""),
         trial = as.numeric(trial)) %>%
  select(-document.id) %>%
  arrange(trial) %>%
  as.data.frame() %>%
  select(-4) %>%
  pivot_wider(names_from = features, values_from = index)

df.exp1.features.other = read_json("data/features/other_exp1.json") %>%
  as.tbl_json %>%
  gather_object("trial") %>%
  gather_array("brick") %>%
  gather_object("features") %>%
  append_values_number("index") %>%
  mutate(trial = str_replace_all(trial, "trial_", ""),
         trial = as.numeric(trial)) %>%
  select(-document.id) %>%
  arrange(trial) %>%
  as.data.frame() %>%
  select(-5) %>%
  pivot_wider(names_from = features, values_from = index) %>%
  select(-brick) %>%
  filter(id != 0)

df.exp1.features.all = df.exp1.features.scene %>%
  rename_with(~ paste0("s.", .), .cols = !any_of("trial")) %>%
  left_join(df.exp1.features.black %>%
              rename_with(~ paste0("b.", .), .cols = !any_of("trial"))
            , by = "trial") %>%
  left_join(df.exp1.features.other %>%
              rename_with(~ paste0("o.", .), .cols = !any_of(c("trial", "id")))
            , by = "trial") %>%
  select(trial, id, everything())

save(df.exp1.features.all, file = "cache/exp1_features_all.RData")

# exp 2

df.exp2.features.scene = read_json("data/features/scene_exp2.json") %>%
  as.tbl_json %>%
  gather_object("trial") %>%
  gather_object("features") %>%
  append_values_number("index") %>%
  mutate(trial = str_replace_all(trial, "trial_", ""),
         trial = as.numeric(trial)) %>%
  select(-document.id) %>%
  arrange(trial) %>%
  as.data.frame() %>%
  select(-4) %>%
  pivot_wider(names_from = features, values_from = index)

df.exp2.features.black = read_json("data/features/black_exp2.json") %>%
  as.tbl_json %>%
  gather_object("trial") %>%
  gather_object("features") %>%
  append_values_number("index") %>%
  mutate(trial = str_replace_all(trial, "trial_", ""),
         trial = as.numeric(trial)) %>%
  select(-document.id) %>%
  arrange(trial) %>%
  as.data.frame() %>%
  select(-4) %>%
  pivot_wider(names_from = features, values_from = index)

df.exp2.features.other = read_json("data/features/other_exp2.json") %>%
  as.tbl_json %>%
  gather_object("trial") %>%
  gather_array("brick") %>%
  gather_object("features") %>%
  append_values_number("index") %>%
  mutate(trial = str_replace_all(trial, "trial_", ""),
         trial = as.numeric(trial)) %>%
  select(-document.id) %>%
  arrange(trial) %>%
  as.data.frame() %>%
  select(-5) %>%
  pivot_wider(names_from = features, values_from = index) %>%
  select(-brick) %>%
  filter(id != 0)

df.exp2.features.all = df.exp2.features.scene %>%
  rename_with(~ paste0("s.", .), .cols = !any_of("trial")) %>%
  left_join(df.exp2.features.black %>%
              rename_with(~ paste0("b.", .), .cols = !any_of("trial"))
            , by = "trial") %>%
  left_join(df.exp2.features.other %>%
              rename_with(~ paste0("o.", .), .cols = !any_of(c("trial", "id")))
            , by = "trial") %>%
  select(trial, id, everything())

save(df.exp2.features.all, file = "cache/exp2_features_all.RData")

# exp 3

df.exp3.features.scene = read_json("data/features/scene_exp3.json") %>%
  as.tbl_json %>%
  gather_object("trial") %>%
  gather_object("features") %>%
  append_values_number("index") %>%
  mutate(trial = str_replace_all(trial, "trial_", ""),
         trial = as.numeric(trial)) %>%
  select(-document.id) %>%
  arrange(trial) %>%
  as.data.frame() %>%
  select(-4) %>%
  pivot_wider(names_from = features, values_from = index)

df.exp3.features.black = read_json("data/features/black_exp3.json") %>%
  as.tbl_json %>%
  gather_object("trial") %>%
  gather_object("features") %>%
  append_values_number("index") %>%
  mutate(trial = str_replace_all(trial, "trial_", ""),
         trial = as.numeric(trial)) %>%
  select(-document.id) %>%
  arrange(trial) %>%
  as.data.frame() %>%
  select(-4) %>%
  pivot_wider(names_from = features, values_from = index)

df.exp3.features.other = read_json("data/features/other_exp3.json") %>%
  as.tbl_json %>%
  gather_object("trial") %>%
  gather_array("brick") %>%
  gather_object("features") %>%
  append_values_number("index") %>%
  mutate(trial = str_replace_all(trial, "trial_", ""),
         trial = as.numeric(trial)) %>%
  select(-document.id) %>%
  arrange(trial) %>%
  as.data.frame() %>%
  select(-5) %>%
  pivot_wider(names_from = features, values_from = index) %>%
  select(-brick)

df.exp3.features.all = df.exp3.features.scene %>%
  rename_with(~ paste0("s.", .), .cols = !any_of("trial")) %>%
  left_join(df.exp3.features.black %>%
              rename_with(~ paste0("b.", .), .cols = !any_of("trial"))
            , by = "trial") %>%
  left_join(df.exp3.features.other %>%
              rename_with(~ paste0("o.", .), .cols = !any_of(c("trial", "id")))
            , by = "trial") %>%
  select(trial, id, everything())

save(df.exp3.features.all, file = "cache/exp3_features_all.RData")

## Simulations

# exp 1
load("data/exp1_info.RData")

df.exp1.model = df.exp1.info %>%
  select(trial, index, fall)

sim_path = "simulations/exp1"
file.names = dir(sim_path)

# count how many files need to be added
count_new = 0
for (i in file.names) {
  j = str_replace(i, ".json", "")
  j = str_replace(j, "perceptual,impulse-aligned,dynamics", "hsm")
  if (!(j %in% colnames(df.exp1.model))) {
    count_new = count_new + 1
  }
}
print(paste("Adding", count_new, "new simulation files."))
n_sims = 200
counter = 0
for (i in 1:length(file.names)) {
  file.name = str_replace(file.names[i], ".json", "")
  file.name = str_replace(file.name, "perceptual,impulse-aligned,dynamics", "hsm")
  if (!(file.name %in% colnames(df.exp1.model))) {
    counter = counter + 1
    print(file.path(sim_path, file.names[i]))
    df.tmp = read_json(file.path(sim_path, file.names[i])) %>%
      as.tbl_json %>%
      gather_object("trial") %>%
      gather_array("simulation") %>%
      gather_array("number") %>%
      append_values_number("index") %>%
      mutate(trial = str_replace_all(trial, "trial_", ""),
             trial = as.numeric(trial)) %>%
      select(-document.id) %>%
      arrange(trial) %>%
      count(trial, index) %>%
      mutate(!!file.name := n / n_sims) %>%
      select(-n)
    
    df.exp1.model = df.exp1.model %>%
      left_join(df.tmp, by = c("trial", "index"))
    
    print(str_c("Finished ", counter, "/", count_new))
  }
}

df.exp1.model[is.na(df.exp1.model)] = 0 # replace all NAs with zeros
save(df.exp1.model, file = "cache/exp1_model.RData")

# exp 2
load("data/exp2_info.RData")

df.exp2.model = df.exp2.info %>%
  select(trial, index, fall)

sim_path = "simulations/exp2"
file.names = dir(sim_path)

# count how many files need to be added
count_new = 0
for (i in file.names) {
  j = str_replace(i, ".json", "")
  j = str_replace(j, "perceptual,impulse-aligned,dynamics", "hsm")
  if (!(j %in% colnames(df.exp2.model))) {
    count_new = count_new + 1
  }
}
print(paste("Adding", count_new, "new simulation files."))
n_sims = 200
counter = 0
for (i in 1:length(file.names)) {
  file.name = str_replace(file.names[i], ".json", "")
  file.name = str_replace(file.name, "perceptual,impulse-aligned,dynamics", "hsm")
  if (!(file.name %in% colnames(df.exp2.model))) {
    counter = counter + 1
    print(file.path(sim_path, file.names[i]))
    df.tmp = read_json(file.path(sim_path, file.names[i])) %>%
      as.tbl_json %>%
      gather_object("trial") %>%
      gather_array("simulation") %>%
      gather_array("number") %>%
      append_values_number("index") %>%
      mutate(trial = str_replace_all(trial, "trial_", ""),
             trial = as.numeric(trial)) %>%
      select(-document.id) %>%
      arrange(trial) %>%
      count(trial, index) %>%
      mutate(!!file.name := n / n_sims) %>%
      select(-n)
    
    df.exp2.model = df.exp2.model %>%
      left_join(df.tmp, by = c("trial", "index"))
    
    print(str_c("Finished ", counter, "/", count_new))
  }
}

df.exp2.model[is.na(df.exp2.model)] = 0 # replace all NAs with zeros
save(df.exp2.model, file = "cache/exp2_model.RData")

# exp 3
load("data/exp3_info.RData")

df.exp3.model = read.csv(file = "data/model_exp3.csv") %>%
  rename(trial = stimulus) %>%
  filter(trial != 43) %>%
  mutate(index = b)

sim_path = "simulations/exp3"
file.names = dir(sim_path)

# count how many files need to be added
count_new = 0
for (i in file.names) {
  j = str_replace(i, ".json", "")
  j = str_replace(j, "perceptual,impulse-aligned,dynamics", "hsm")
  if (!(j %in% colnames(df.exp3.model))) {
    count_new = count_new + 1
  }
}
print(paste("Adding", count_new, "new simulation files."))
n_sims = 400
counter = 0
for (i in 1:length(file.names)) {
  file.name = str_replace(file.names[i], ".json", "")
  file.name = str_replace(file.name, "perceptual,impulse-aligned,dynamics", "hsm")
  if (!(file.name %in% colnames(df.exp3.model))) {
    counter = counter + 1
    print(file.path(sim_path, file.names[i]))
    df.tmp = read_json(file.path(sim_path, file.names[i])) %>%
      as.tbl_json %>%
      gather_object("trial") %>%
      gather_array("simulation") %>%
      gather_array("number") %>%
      append_values_number("index") %>%
      mutate(trial = str_replace_all(trial, "trial_", ""),
             trial = as.numeric(trial)) %>%
      select(-document.id) %>%
      arrange(trial) %>%
      count(trial, index) %>%
      mutate(!!file.name := n / n_sims) %>%
      select(-n)
    
    df.exp3.model = df.exp3.model %>%
      left_join(df.tmp, by = c("trial", "index"))
    
    print(str_c("Finished ", counter, "/", count_new))
  }
}

df.exp3.model[is.na(df.exp3.model)] = 0 # replace all NAs with zeros

df.exp3.model = df.exp3.model %>% 
  left_join(df.exp3.info %>% select(trial, index, fall),
            by = c("trial", "index")) %>% 
  select(trial, index, fall, everything())

save(df.exp3.model, file = "cache/exp3_model.RData")


## Anonymization

df.exp1.participants = df.exp1.wide %>% 
  select(-contains(c("id", "image", "response")))

df.exp2.participants = df.exp2.wide %>% 
  select(-contains(c("id", "image", "response")))

df.exp3.participants = df.exp3.data %>% 
  pull(datastring) %>% 
  spread_values(age = jstring("questiondata", "age"),
                gender = jstring("questiondata", "sex"),
                feedback = jstring("questiondata", "feedback")) %>%
  as_tibble() %>%
  rename(participant = document.id) %>% 
  mutate(time = difftime(df.exp3.data$endhit, df.exp3.data$beginhit)) %>%
  left_join(df.exp3.data %>%
              select(participant, experiment = codeversion),
            by = "participant")

save(df.exp1.participants, file = "data/exp1_participants.RData")
save(df.exp2.participants, file = "data/exp2_participants.RData")
save(df.exp3.participants, file = "data/exp3_participants.RData")

