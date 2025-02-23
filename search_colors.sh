#!/bin/bash
echo "Searching for hex color codes..."
rg -n "(?<!-)#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})(?![0-9a-fA-F])" --type css --type tsx --type jsx --type ts --type js
echo -e "\nSearching for rgb/rgba values..."
rg -n "(?<!var\()rgb(a)?\([^)]+\)" --type css --type tsx --type jsx --type ts --type js
echo -e "\nSearching for named colors..."
rg -n "\b(red|blue|green|yellow|purple|orange|black|white|gray|grey)\b" --type css --type tsx --type jsx --type ts --type js
