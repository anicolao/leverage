{
  description = "Historical leveraged Canadian portfolio backtester scaffold";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "aarch64-darwin" "x86_64-darwin" "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
    in {
      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
          python = pkgs.python312.withPackages (ps: with ps; [
            numpy
            pandas
            pytest
            yfinance
          ]);
        in {
          default = pkgs.mkShell {
            packages = [
              python
              pkgs.nodejs_24
              pkgs.ruff
            ];

            shellHook = ''
              export PYTHONPATH="$PWD:$PYTHONPATH"
            '';
          };
        });
    };
}
