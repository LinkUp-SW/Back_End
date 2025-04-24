pipeline {
    agent any
    environment {
        CI = "true"  
        VAULT_SECRET = vault path: 'secret/jenkins/Back_env', engineVersion: "2", key: 'value'
        DOCKERHUB_CREDENTIALS = credentials('docker-token')
        IMAGE_NAME = credentials('DockerHub-back-repo')
    }
    stages {
        stage('Checkout') {
            steps {
                sh ' rm -rf mywork'
                checkout scm      
                //#sh 'mkdir mywork && mv * mywork/ 2>/dev/null || true' 
                }
        }
       /*
       stage('Install Dependencies') { 
            steps {
                echo 'installing dependencies...' 
                sh '''
                    cd mywork
                    npm install
                '''
                 
            }
        }
        stage('Build') { 
            steps {
                 echo 'building...' 
                sh '''
                    cd mywork
                    npm run build
                    cd ..
                    rm -rf mywork
                 '''
            }
        }
        */
        stage('Build Docker Image') {
            steps {
                script {
                    sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                 sh """
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push ${IMAGE_NAME}:${IMAGE_TAG}
                        docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest
                        docker push ${IMAGE_NAME}:latest
                    """
                    }
                }
            }
        }

        stage('Deploy Locally') {
            steps {
                script {
                    sh """
                        docker pull ${IMAGE_NAME}:${IMAGE_TAG}
                        docker stop backend || true
                        docker rm backend || true
                        docker run -d --name backend -p 3000:3000 ${IMAGE_NAME}:${IMAGE_TAG}
                    """
                }
            }
        }
    }
    post {
        success {
            script {
                 githubNotify context: 'Pipeline Wizard Speaking',
                         description: 'Build successful, good job :)',
                         status: 'SUCCESS',
                         repo: 'Back_End',
                         credentialsId: 'notify-token',
                         account: 'LinkUp-SW',
                         sha: env.GIT_COMMIT
            }
        }
        failure {
            script {
                githubNotify context: 'Pipeline Wizard Speaking',
                         description: 'Build failed, rage3 nafsak :(',
                         status: 'FAILURE',
                         repo: 'Back_End',
                         credentialsId: 'notify-token',
                         account: 'LinkUp-SW',
                         sha: env.GIT_COMMIT
            }
        }
    }

}
