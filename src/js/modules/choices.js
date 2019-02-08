    casualties() {

        var self = this

        console.log(self.identities)

        //specials

        /*

        this.choice = new Choices(document.getElementById('casualties'), {

            removeItemButton: true,

        });

        this.choice.setChoices(self.identities, 'value', 'label', false);

        this.choice.passedElement.element.addEventListener('addItem', function(event) {

            self.database.identities.push(+event.detail.value)

                self.getData().then( (data) => {

                    self.ractive.set(self.database)

                })

        });

        this.choice.passedElement.element.addEventListener('removeItem', function(event) {

            var index = self.database.identities.indexOf(+event.detail.value);

            if (index !== -1) self.database.identities.splice(index, 1);

            self.getData().then( (data) => {

                self.ractive.set(self.database)

            })

        });

        /*

    }