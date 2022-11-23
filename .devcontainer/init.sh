#!/bin/bash
echo "bashrc initialize!!!"
echo -e "set number\ninoremap <silent> jj <ESC>" > ~/.vimrc && echo -e "alias ll='ls -alF'" >> ~/.bashrc && echo -e "alias la='ls -A'" >> ~/.bashrc && echo -e "alias l='ls -CF'" >> ~/.bashrc && echo -e "alias ..='cd ..'" >> ~/.bashrc  && echo -e "cdls ()\n{\n\\t \\\cd \"\$@\" && la\n}\nalias cd='cdls'" >> ~/.bashrc
echo -e "rere ()\n{\n\\t echo refresh && . ~/.bashrc\n}\nalias re='rere'" >> ~/.bashrc
. ~/.bashrc