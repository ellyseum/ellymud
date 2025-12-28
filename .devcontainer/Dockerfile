# EllyMUD Development Container
# Matches WSL dev environment: Node 22, zsh with oh-my-zsh + powerlevel10k

FROM node:22-bookworm

# Install essential tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    zsh \
    fonts-powerline \
    telnet \
    && rm -rf /var/lib/apt/lists/*

# Install oh-my-zsh
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# Install powerlevel10k theme
RUN git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k

# Configure zsh
RUN sed -i 's/ZSH_THEME="robbyrussell"/ZSH_THEME="powerlevel10k\/powerlevel10k"/' ~/.zshrc \
    && echo 'POWERLEVEL9K_DISABLE_CONFIGURATION_WIZARD=true' >> ~/.zshrc

# Set zsh as default shell
RUN chsh -s $(which zsh)

# Set working directory
WORKDIR /workspace

# Default to zsh
CMD ["zsh"]
