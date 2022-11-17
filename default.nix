(
  import
  (
    let
      lock = builtins.fromJSON (builtins.readFile ./flake.lock);
    in
      fetchTarball {url = "https://github.com/edolstra/flake-compat/archive/master.tar.gz";}
  )
  {src = ./.;}
)
.defaultNix
